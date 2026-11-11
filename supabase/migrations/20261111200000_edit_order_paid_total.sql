-- When editing an order, the admin now sets the order's total paid amount
-- (payload "paid_total") instead of only adding an extra payment. Payments
-- are reconciled to that target: a new payment is added for the difference,
-- or the most recent payments are reduced/removed when the target is lower.
-- Payloads without "paid_total" keep the previous behaviour.
create or replace function public.save_order(p_payload jsonb, p_order_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_family text := regexp_replace(trim(coalesce(p_payload ->> 'family_name', '')), '\s+', ' ', 'g');
  v_key text := public.normalize_family_key(p_payload ->> 'family_name');
  v_wa text := trim(coalesce(p_payload ->> 'whatsapp_number', ''));
  v_notes text := nullif(trim(coalesce(p_payload ->> 'notes', '')), '');
  v_method text := coalesce(p_payload ->> 'payment_method', '');
  v_channel text := coalesce(nullif(p_payload ->> 'payment_channel', ''), 'Tunai');
  v_amount integer;
  v_items jsonb := coalesce(p_payload -> 'items', '[]'::jsonb);
  v_count integer;
  v_max integer := public.get_setting_int('max_shirts_per_order', 6);
  v_order public.orders%rowtype;
  v_existing_item public.order_items%rowtype;
  v_item jsonb;
  v_idx integer := 0;
  v_item_id uuid;
  v_keep_ids uuid[] := '{}';
  v_resolved jsonb := '[]'::jsonb;
  v_price integer;
  v_subtotal integer;
  v_subsidy integer;
  v_total integer;
  v_paid integer;
  v_pay integer;
  v_target integer;
  v_excess integer;
  v_payment public.payments%rowtype;
  v_reconcile boolean := p_order_id is not null and p_payload ? 'paid_total';
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  if v_family = '' or char_length(v_family) > 120 then
    raise exception 'Nama KK wajib diisi (maksimal 120 karakter).';
  end if;
  if v_wa !~ '^[0-9+\-\s()]{8,20}$' then
    raise exception 'Nomor WhatsApp tidak valid.';
  end if;
  if v_method not in ('Bayar langsung (lunas)', 'Cicil terlebih dahulu') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;
  if v_channel not in ('Tunai', 'Transfer') then
    raise exception 'Cara pembayaran tidak valid.';
  end if;
  if jsonb_typeof(v_items) <> 'array' then
    raise exception 'Data kaos tidak valid.';
  end if;

  begin
    v_amount := coalesce(nullif(p_payload ->> 'payment_amount', '')::numeric, 0)::integer;
    v_target := coalesce(nullif(p_payload ->> 'paid_total', '')::numeric, 0)::integer;
  exception when others then
    raise exception 'Jumlah pembayaran tidak valid.';
  end;
  if v_amount < 0 or v_target < 0 then
    raise exception 'Pembayaran tidak boleh negatif.';
  end if;

  v_count := jsonb_array_length(v_items);
  if v_count < 1 or v_count > v_max then
    raise exception 'Jumlah kaos harus antara 1 dan %.', v_max;
  end if;

  -- Serialise all writes for the same family to make subsidy checks race-free.
  perform pg_advisory_xact_lock(hashtext('kaos-family:' || v_key));

  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id for update;
    if not found then
      raise exception 'Pesanan tidak ditemukan.';
    end if;
    if v_order.family_key <> v_key then
      perform pg_advisory_xact_lock(hashtext('kaos-family:' || v_order.family_key));
    end if;
  end if;

  -- Validate and price every item before writing anything.
  v_subtotal := 0;
  for v_item in select * from jsonb_array_elements(v_items) loop
    v_idx := v_idx + 1;

    if trim(coalesce(v_item ->> 'wearer_name', '')) = '' then
      raise exception 'Nama pemakai Kaos % wajib diisi.', v_idx;
    end if;
    if coalesce(v_item ->> 'wearer_type', '') not in ('Dewasa', 'Anak') then
      raise exception 'Tipe pemakai Kaos % tidak valid.', v_idx;
    end if;
    if coalesce(v_item ->> 'category', '') not in ('Pria', 'Wanita berhijab', 'Wanita tidak berhijab') then
      raise exception 'Kategori Kaos % tidak valid.', v_idx;
    end if;
    if coalesce(v_item ->> 'size', '') not in ('S','M','L','XL','XXL','XXXL','4XL','5XL') then
      raise exception 'Ukuran Kaos % tidak valid.', v_idx;
    end if;
    if coalesce(v_item ->> 'sleeve_type', '') not in ('Lengan pendek', 'Lengan panjang', 'Lengan panjang 7/8') then
      raise exception 'Jenis lengan Kaos % tidak valid.', v_idx;
    end if;

    if char_length(trim(v_item ->> 'wearer_name')) > 120 then
      raise exception 'Nama pemakai Kaos % terlalu panjang.', v_idx;
    end if;

    v_item_id := null;
    if p_order_id is not null and nullif(v_item ->> 'id', '') is not null then
      select * into v_existing_item
      from public.order_items
      where id::text = v_item ->> 'id' and order_id = v_order.id;
      if found then
        v_item_id := v_existing_item.id;
      end if;
    end if;

    -- Preserve the historical price snapshot unless a price-relevant field changed.
    if v_item_id is not null
       and v_existing_item.size = v_item ->> 'size'
       and v_existing_item.sleeve_type = v_item ->> 'sleeve_type'
       and v_existing_item.wearer_type = v_item ->> 'wearer_type' then
      v_price := v_existing_item.unit_price;
    else
      v_price := public.calc_item_price(v_item ->> 'size', v_item ->> 'sleeve_type', v_item ->> 'wearer_type');
    end if;

    v_subtotal := v_subtotal + v_price;
    v_resolved := v_resolved || jsonb_build_array(
      v_item || jsonb_build_object('id', v_item_id, 'unit_price', v_price, 'item_no', v_idx)
    );
  end loop;

  v_subsidy := public.resolve_family_subsidy(v_key, p_order_id);
  v_total := greatest(0, v_subtotal - v_subsidy);

  if p_order_id is null then
    if v_method = 'Cicil terlebih dahulu' and v_amount > v_total then
      raise exception 'Pembayaran awal (Rp%) melebihi total tagihan (Rp%).', v_amount, v_total;
    end if;

    insert into public.orders (family_name, family_key, whatsapp_number, payment_method, notes, created_by)
    values (v_family, v_key, v_wa, v_method, v_notes, v_uid)
    returning * into v_order;
  end if;

  for v_item in select * from jsonb_array_elements(v_resolved) loop
    if nullif(v_item ->> 'id', '') is not null then
      update public.order_items
      set item_no = (v_item ->> 'item_no')::integer,
          wearer_name = trim(v_item ->> 'wearer_name'),
          wearer_type = v_item ->> 'wearer_type',
          category = v_item ->> 'category',
          size = v_item ->> 'size',
          sleeve_type = v_item ->> 'sleeve_type',
          unit_price = (v_item ->> 'unit_price')::integer
      where id = (v_item ->> 'id')::uuid
      returning id into v_item_id;
    else
      insert into public.order_items (order_id, item_no, wearer_name, wearer_type, category, size, sleeve_type, unit_price)
      values (v_order.id, (v_item ->> 'item_no')::integer, trim(v_item ->> 'wearer_name'), v_item ->> 'wearer_type',
              v_item ->> 'category', v_item ->> 'size', v_item ->> 'sleeve_type', (v_item ->> 'unit_price')::integer)
      returning id into v_item_id;
    end if;

    v_keep_ids := v_keep_ids || v_item_id;
  end loop;

  delete from public.order_items where order_id = v_order.id and not (id = any (v_keep_ids));

  update public.orders
  set family_name = v_family,
      family_key = v_key,
      whatsapp_number = v_wa,
      payment_method = v_method,
      notes = v_notes,
      total_quantity = v_count,
      subtotal = v_subtotal,
      subsidy_amount = v_subsidy,
      total_amount = v_total
  where id = v_order.id;

  -- Payments
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = v_order.id;

  if v_reconcile then
    if v_method = 'Bayar langsung (lunas)' then
      v_target := v_total;
    elsif v_target > v_total then
      raise exception 'Total dibayar (Rp%) melebihi total tagihan (Rp%).', v_target, v_total;
    end if;

    v_pay := greatest(0, v_target - v_paid);
    if v_pay > 0 then
      insert into public.payments (order_id, amount, payment_method, notes, created_by)
      values (v_order.id, v_pay, v_channel, 'Pembayaran saat ubah pesanan', v_uid);
    elsif v_target < v_paid then
      v_excess := v_paid - v_target;
      for v_payment in
        select * from public.payments
        where order_id = v_order.id
        order by payment_date desc, created_at desc
      loop
        exit when v_excess <= 0;
        if v_payment.amount <= v_excess then
          delete from public.payments where id = v_payment.id;
          v_excess := v_excess - v_payment.amount;
        else
          update public.payments set amount = amount - v_excess where id = v_payment.id;
          v_excess := 0;
        end if;
      end loop;
    end if;
  else
    if v_paid > v_total then
      raise exception 'Total pembayaran tercatat (Rp%) melebihi total tagihan baru (Rp%). Hapus sebagian pembayaran terlebih dahulu.', v_paid, v_total;
    end if;

    if v_method = 'Bayar langsung (lunas)' then
      v_pay := v_total - v_paid;
    else
      if v_amount > v_total - v_paid then
        raise exception 'Jumlah pembayaran (Rp%) melebihi sisa tagihan (Rp%).', v_amount, v_total - v_paid;
      end if;
      v_pay := v_amount;
    end if;

    if v_pay > 0 then
      insert into public.payments (order_id, amount, payment_method, notes, created_by)
      values (
        v_order.id, v_pay, v_channel,
        case when p_order_id is null then 'Pembayaran awal' else 'Pembayaran saat ubah pesanan' end,
        v_uid
      );
    end if;
  end if;

  perform public.recalc_order_payment(v_order.id);

  select * into v_order from public.orders where id = v_order.id;
  return to_jsonb(v_order) || jsonb_build_object('last_payment_amount', v_pay);
end;
$$;
