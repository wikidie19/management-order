-- =============================================================
-- Dummy data for development / demo.
-- Runs automatically on `supabase db reset`, or paste it into the
-- Supabase SQL Editor. Prices, subsidies and payment status are
-- calculated with the same database functions the app uses.
-- Do NOT run this on production data.
-- =============================================================

do $$
declare
  v_order record;
  v_item jsonb;
  v_id uuid;
  v_no integer;
  v_subtotal integer;
  v_subsidy integer;
  v_total integer;
  v_pay jsonb;
begin
  for v_order in
    select *
    from jsonb_to_recordset($json$[
      {"family": "Budi Santoso", "wa": "081234567801", "method": "Bayar langsung (lunas)", "days": 20,
       "items": [["Budi Santoso","Dewasa","Pria","XL","Lengan pendek"],
                 ["Sri Wahyuni","Dewasa","Wanita berhijab","L","Lengan panjang"],
                 ["Rafi","Anak","Pria","M","Lengan pendek"]],
       "payments": "full"},
      {"family": "Agus Prasetyo", "wa": "081234567802", "method": "Cicil terlebih dahulu", "days": 19,
       "items": [["Agus Prasetyo","Dewasa","Pria","XXL","Lengan panjang"],
                 ["Dewi Lestari","Dewasa","Wanita tidak berhijab","M","Lengan panjang 7/8"]],
       "payments": [50000]},
      {"family": "Hendra Gunawan", "wa": "081234567803", "method": "Cicil terlebih dahulu", "days": 18,
       "items": [["Hendra Gunawan","Dewasa","Pria","4XL","Lengan pendek"]],
       "payments": []},
      {"family": "Slamet Riyadi", "wa": "081234567804", "method": "Bayar langsung (lunas)", "days": 17,
       "items": [["Slamet Riyadi","Dewasa","Pria","L","Lengan panjang"],
                 ["Siti Aminah","Dewasa","Wanita berhijab","XL","Lengan panjang 7/8"],
                 ["Nabila","Anak","Wanita berhijab","S","Lengan panjang"],
                 ["Fajar","Anak","Pria","S","Lengan pendek"]],
       "payments": "full"},
      {"family": "Joko Susilo", "wa": "081234567805", "method": "Cicil terlebih dahulu", "days": 15,
       "items": [["Joko Susilo","Dewasa","Pria","XXXL","Lengan pendek"],
                 ["Rina Marlina","Dewasa","Wanita berhijab","XXL","Lengan panjang"],
                 ["Dimas","Anak","Pria","M","Lengan pendek"]],
       "payments": [60000, 40000]},
      {"family": "Wahyu Hidayat", "wa": "081234567806", "method": "Cicil terlebih dahulu", "days": 14,
       "items": [["Wahyu Hidayat","Dewasa","Pria","M","Lengan pendek"],
                 ["Ayu Puspita","Dewasa","Wanita tidak berhijab","S","Lengan pendek"]],
       "payments": []},
      {"family": "Bambang Sutrisno", "wa": "081234567807", "method": "Bayar langsung (lunas)", "days": 12,
       "items": [["Bambang Sutrisno","Dewasa","Pria","5XL","Lengan panjang"],
                 ["Endang Kusuma","Dewasa","Wanita berhijab","4XL","Lengan panjang 7/8"]],
       "payments": "full"},
      {"family": "Rudi Hartono", "wa": "081234567808", "method": "Cicil terlebih dahulu", "days": 10,
       "items": [["Rudi Hartono","Dewasa","Pria","XL","Lengan panjang"],
                 ["Yuli Astuti","Dewasa","Wanita berhijab","L","Lengan panjang"],
                 ["Alya","Anak","Wanita berhijab","M","Lengan panjang"],
                 ["Bima","Anak","Pria","S","Lengan pendek"],
                 ["Citra","Anak","Wanita tidak berhijab","S","Lengan pendek"]],
       "payments": [100000]},
      {"family": "Eko Saputra", "wa": "081234567809", "method": "Bayar langsung (lunas)", "days": 8,
       "items": [["Eko Saputra","Dewasa","Pria","L","Lengan pendek"]],
       "payments": "full"},
      {"family": "Teguh Wibowo", "wa": "081234567810", "method": "Cicil terlebih dahulu", "days": 7,
       "items": [["Teguh Wibowo","Dewasa","Pria","XXL","Lengan pendek"],
                 ["Ratna Sari","Dewasa","Wanita berhijab","XL","Lengan panjang"],
                 ["Galih","Dewasa","Pria","L","Lengan pendek"],
                 ["Intan","Anak","Wanita berhijab","M","Lengan panjang 7/8"],
                 ["Kevin","Anak","Pria","S","Lengan pendek"],
                 ["Laras","Anak","Wanita tidak berhijab","S","Lengan pendek"]],
       "payments": [150000]},
      {"family": "Budi Santoso", "wa": "081234567801", "method": "Cicil terlebih dahulu", "days": 5,
       "items": [["Mbah Karto","Dewasa","Pria","XXL","Lengan panjang"]],
       "payments": []},
      {"family": "Yusuf Maulana", "wa": "081234567811", "method": "Bayar langsung (lunas)", "days": 4,
       "items": [["Yusuf Maulana","Dewasa","Pria","M","Lengan panjang 7/8"],
                 ["Fitri Handayani","Dewasa","Wanita berhijab","M","Lengan panjang 7/8"]],
       "payments": "full"},
      {"family": "Dedi Kurniawan", "wa": "081234567812", "method": "Cicil terlebih dahulu", "days": 2,
       "items": [["Dedi Kurniawan","Dewasa","Pria","XL","Lengan pendek"],
                 ["Nurul Hidayah","Dewasa","Wanita berhijab","L","Lengan panjang"],
                 ["Zahra","Anak","Wanita berhijab","S","Lengan panjang"]],
       "payments": [25000]},
      {"family": "Arif Rahman", "wa": "081234567813", "method": "Cicil terlebih dahulu", "days": 1,
       "items": [["Arif Rahman","Dewasa","Pria","XXXL","Lengan panjang"]],
       "payments": []}
    ]$json$::jsonb) as x(family text, wa text, method text, days integer, items jsonb, payments jsonb)
  loop
    insert into public.orders (family_name, family_key, whatsapp_number, payment_method, created_at)
    values (v_order.family, public.normalize_family_key(v_order.family), v_order.wa, v_order.method,
            now() - make_interval(days => v_order.days))
    returning id into v_id;

    v_no := 0;
    for v_item in select * from jsonb_array_elements(v_order.items) loop
      v_no := v_no + 1;
      insert into public.order_items (order_id, item_no, wearer_name, wearer_type, category, size, sleeve_type, unit_price)
      values (v_id, v_no, v_item ->> 0, v_item ->> 1, v_item ->> 2, v_item ->> 3, v_item ->> 4,
              public.calc_item_price(v_item ->> 3, v_item ->> 4, v_item ->> 1));
    end loop;

    select coalesce(sum(unit_price), 0) into v_subtotal from public.order_items where order_id = v_id;
    v_subsidy := public.resolve_family_subsidy(public.normalize_family_key(v_order.family), v_id);
    v_total := greatest(0, v_subtotal - v_subsidy);

    update public.orders
    set total_quantity = v_no, subtotal = v_subtotal, subsidy_amount = v_subsidy, total_amount = v_total
    where id = v_id;

    if v_order.payments = '"full"'::jsonb then
      if v_total > 0 then
        insert into public.payments (order_id, amount, payment_date, payment_method, notes)
        values (v_id, v_total, (now() - make_interval(days => v_order.days))::date, 'Tunai', 'Pembayaran awal');
      end if;
    else
      for v_pay in select * from jsonb_array_elements(v_order.payments) loop
        insert into public.payments (order_id, amount, payment_date, payment_method, notes)
        values (v_id, least((v_pay #>> '{}')::integer, v_total), (now() - make_interval(days => v_order.days))::date,
                'Transfer', 'Cicilan');
      end loop;
    end if;

    perform public.recalc_order_payment(v_id);
  end loop;
end;
$$;
