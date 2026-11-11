-- =============================================================
-- Pemesanan Kaos RT 02 – ERTE DUA, GUYUP RUKUN
-- Initial schema, RLS policies and secure RPC functions.
-- =============================================================

-- -------------------------------------------------------------
-- Helpers
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normalised family key used to enforce "one subsidy per KK".
create or replace function public.normalize_family_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
$$;

-- -------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- -------------------------------------------------------------
-- app_settings
-- -------------------------------------------------------------
create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

insert into public.app_settings (setting_key, setting_value, description) values
  ('max_shirts_per_order', '6', 'Maksimal jumlah kaos per pesanan'),
  ('family_subsidy_amount', '30000', 'Subsidi kas RT per KK (sekali per KK)');

-- -------------------------------------------------------------
-- pricing_configs
-- -------------------------------------------------------------
create table public.pricing_configs (
  id uuid primary key default gen_random_uuid(),
  size_group text not null,
  sizes text[] not null,
  sleeve_type text not null
    check (sleeve_type in ('Lengan pendek', 'Lengan panjang', 'Lengan panjang 7/8')),
  adult_price integer not null check (adult_price >= 0),
  child_discount integer not null default 20000 check (child_discount >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index pricing_configs_active_unique
  on public.pricing_configs (size_group, sleeve_type)
  where is_active;

create trigger pricing_configs_set_updated_at
before update on public.pricing_configs
for each row execute function public.set_updated_at();

insert into public.pricing_configs (size_group, sizes, sleeve_type, adult_price) values
  ('S–XL',     array['S','M','L','XL'], 'Lengan pendek',      60000),
  ('S–XL',     array['S','M','L','XL'], 'Lengan panjang',     67000),
  ('S–XL',     array['S','M','L','XL'], 'Lengan panjang 7/8', 67000),
  ('XXL–XXXL', array['XXL','XXXL'],     'Lengan pendek',      65000),
  ('XXL–XXXL', array['XXL','XXXL'],     'Lengan panjang',     72000),
  ('XXL–XXXL', array['XXL','XXXL'],     'Lengan panjang 7/8', 72000),
  ('4XL–5XL',  array['4XL','5XL'],      'Lengan pendek',      70000),
  ('4XL–5XL',  array['4XL','5XL'],      'Lengan panjang',     77000),
  ('4XL–5XL',  array['4XL','5XL'],      'Lengan panjang 7/8', 77000);

-- -------------------------------------------------------------
-- orders
-- -------------------------------------------------------------
create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('RT02-' || lpad(nextval('public.order_number_seq')::text, 4, '0')),
  family_name text not null check (char_length(trim(family_name)) between 1 and 120),
  family_key text not null,
  whatsapp_number text not null check (whatsapp_number ~ '^[0-9+\-\s()]{8,20}$'),
  total_quantity integer not null default 0 check (total_quantity >= 0),
  subtotal integer not null default 0 check (subtotal >= 0),
  subsidy_amount integer not null default 0 check (subsidy_amount >= 0),
  total_amount integer not null default 0 check (total_amount >= 0),
  total_paid integer not null default 0 check (total_paid >= 0),
  remaining_balance integer not null default 0 check (remaining_balance >= 0),
  payment_status text not null default 'Belum bayar'
    check (payment_status in ('Lunas', 'Cicil', 'Belum bayar')),
  payment_method text not null
    check (payment_method in ('Bayar langsung (lunas)', 'Cicil terlebih dahulu')),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

alter sequence public.order_number_seq owned by public.orders.order_number;

-- Database-level guarantee: at most one subsidised order per family.
create unique index orders_one_subsidy_per_family
  on public.orders (family_key)
  where subsidy_amount > 0;

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_payment_status_idx on public.orders (payment_status);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- order_items
-- -------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_no integer not null check (item_no >= 1),
  wearer_name text not null check (char_length(trim(wearer_name)) between 1 and 120),
  wearer_type text not null check (wearer_type in ('Dewasa', 'Anak')),
  category text not null
    check (category in ('Pria', 'Wanita berhijab', 'Wanita tidak berhijab')),
  size text not null
    check (size in ('S','M','L','XL','XXL','XXXL','4XL','5XL')),
  sleeve_type text not null
    check (sleeve_type in ('Lengan pendek', 'Lengan panjang', 'Lengan panjang 7/8')),
  unit_price integer not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

create trigger order_items_set_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- payments
-- -------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount integer not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null default 'Tunai'
    check (payment_method in ('Tunai', 'Transfer')),
  notes text check (char_length(notes) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index payments_order_id_idx on public.payments (order_id);

-- -------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.app_settings    enable row level security;
alter table public.pricing_configs enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.payments        enable row level security;

create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "app_settings: admin read" on public.app_settings
  for select to authenticated using ((select public.is_admin()));

create policy "pricing_configs: admin read" on public.pricing_configs
  for select to authenticated using ((select public.is_admin()));

create policy "orders: admin read" on public.orders
  for select to authenticated using ((select public.is_admin()));

create policy "orders: admin delete" on public.orders
  for delete to authenticated using ((select public.is_admin()));

create policy "order_items: admin read" on public.order_items
  for select to authenticated using ((select public.is_admin()));

create policy "payments: admin read" on public.payments
  for select to authenticated using ((select public.is_admin()));

-- Public (anon) users get no direct table access at all; the public list is
-- served by list_public_orders(). Writes go exclusively through RPCs so that
-- prices, subsidies and totals are always calculated server-side.
revoke all on public.profiles, public.app_settings, public.pricing_configs,
  public.orders, public.order_items, public.payments from anon;
revoke insert, update, delete on public.profiles, public.app_settings,
  public.pricing_configs, public.order_items, public.payments from authenticated;
revoke insert, update on public.orders from authenticated;
revoke all on sequence public.order_number_seq from anon, authenticated;

-- -------------------------------------------------------------
-- Business logic
-- -------------------------------------------------------------
create or replace function public.get_setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (setting_value #>> '{}')::integer from public.app_settings where setting_key = p_key),
    p_default
  );
$$;

create or replace function public.calc_item_price(p_size text, p_sleeve text, p_wearer_type text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cfg public.pricing_configs%rowtype;
begin
  select * into v_cfg
  from public.pricing_configs
  where is_active and sleeve_type = p_sleeve and p_size = any (sizes)
  limit 1;

  if not found then
    raise exception 'Harga belum tersedia untuk % ukuran %', p_sleeve, p_size;
  end if;

  if p_wearer_type = 'Anak' then
    return greatest(0, v_cfg.adult_price - v_cfg.child_discount);
  end if;
  return v_cfg.adult_price;
end;
$$;

-- Subsidy that an order for this family would receive. Keeps the stored
-- subsidy snapshot when an already-subsidised order keeps the same family.
create or replace function public.resolve_family_subsidy(p_family_key text, p_order_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_existing public.orders%rowtype;
begin
  if p_order_id is not null then
    select * into v_existing from public.orders where id = p_order_id;
    if found and v_existing.family_key = p_family_key and v_existing.subsidy_amount > 0 then
      return v_existing.subsidy_amount;
    end if;
  end if;

  if exists (
    select 1 from public.orders
    where family_key = p_family_key
      and subsidy_amount > 0
      and (p_order_id is null or id <> p_order_id)
  ) then
    return 0;
  end if;

  return public.get_setting_int('family_subsidy_amount', 30000);
end;
$$;

-- Recalculates payment totals and status from the payments table.
create or replace function public.recalc_order_payment(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_paid integer;
begin
  select total_amount into v_total from public.orders where id = p_order_id;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = p_order_id;

  if v_paid > v_total then
    raise exception 'Total pembayaran (Rp%) melebihi total tagihan (Rp%).', v_paid, v_total;
  end if;

  update public.orders
  set total_paid = v_paid,
      remaining_balance = v_total - v_paid,
      payment_status = case
        when v_total - v_paid = 0 then 'Lunas'
        when v_paid > 0 then 'Cicil'
        else 'Belum bayar'
      end
  where id = p_order_id;
end;
$$;

-- Creates (p_order_id null) or updates an order atomically.
--
-- p_payload:
-- {
--   "family_name": text, "whatsapp_number": text, "notes": text|null,
--   "payment_method": "Bayar langsung (lunas)" | "Cicil terlebih dahulu",
--   "payment_amount": int   -- initial (create) or additional (edit) payment, cicil only
--   "payment_channel": "Tunai" | "Transfer",
--   "items": [{ "id": uuid|null, "wearer_name", "wearer_type", "category", "size", "sleeve_type" }]
-- }
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
  exception when others then
    raise exception 'Jumlah pembayaran tidak valid.';
  end;
  if v_amount < 0 then
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

  perform public.recalc_order_payment(v_order.id);

  select * into v_order from public.orders where id = v_order.id;
  return to_jsonb(v_order) || jsonb_build_object('last_payment_amount', v_pay);
end;
$$;

create or replace function public.add_payment(
  p_order_id uuid,
  p_amount integer,
  p_payment_date date default current_date,
  p_payment_method text default 'Tunai',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Jumlah pembayaran harus lebih dari 0.';
  end if;
  if p_amount > v_order.remaining_balance then
    raise exception 'Jumlah pembayaran (Rp%) melebihi sisa tagihan (Rp%).', p_amount, v_order.remaining_balance;
  end if;
  if coalesce(p_payment_method, 'Tunai') not in ('Tunai', 'Transfer') then
    raise exception 'Cara pembayaran tidak valid.';
  end if;

  insert into public.payments (order_id, amount, payment_date, payment_method, notes, created_by)
  values (p_order_id, p_amount, coalesce(p_payment_date, current_date),
          coalesce(p_payment_method, 'Tunai'), nullif(trim(coalesce(p_notes, '')), ''), auth.uid());

  perform public.recalc_order_payment(p_order_id);

  select * into v_order from public.orders where id = p_order_id;
  return to_jsonb(v_order);
end;
$$;

create or replace function public.delete_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  select order_id into v_order_id from public.payments where id = p_payment_id;
  if v_order_id is null then
    raise exception 'Pembayaran tidak ditemukan.';
  end if;

  perform 1 from public.orders where id = v_order_id for update;
  delete from public.payments where id = p_payment_id;
  perform public.recalc_order_payment(v_order_id);

  select * into v_order from public.orders where id = v_order_id;
  return to_jsonb(v_order);
end;
$$;

-- Subsidy preview for the admin form (the save is still authoritative).
create or replace function public.preview_family_subsidy(p_family_name text, p_order_id uuid default null)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;
  return public.resolve_family_subsidy(public.normalize_family_key(p_family_name), p_order_id);
end;
$$;

-- Public, read-only order list exposing only non-sensitive columns.
create or replace function public.list_public_orders(
  p_search text default null,
  p_status text default null,
  p_sort text default 'newest',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  order_number text,
  family_name text,
  total_quantity integer,
  size_summary text,
  created_at timestamptz,
  payment_status text,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with filtered as (
    select o.id, o.order_number, o.family_name, o.total_quantity, o.created_at, o.payment_status
    from public.orders o
    where (coalesce(trim(p_search), '') = ''
           or o.order_number ilike '%' || trim(p_search) || '%'
           or o.family_name ilike '%' || trim(p_search) || '%')
      and (coalesce(p_status, '') = '' or o.payment_status = p_status)
  )
  select
    f.order_number,
    f.family_name,
    f.total_quantity,
    (
      select string_agg(s.size || ' ×' || s.cnt, ', '
               order by array_position(array['S','M','L','XL','XXL','XXXL','4XL','5XL'], s.size))
      from (
        select i.size, count(*) as cnt
        from public.order_items i
        where i.order_id = f.id
        group by i.size
      ) s
    ) as size_summary,
    f.created_at,
    f.payment_status,
    count(*) over () as total_count
  from filtered f
  order by
    case when p_sort = 'oldest' then f.created_at end asc,
    case when p_sort is distinct from 'oldest' then f.created_at end desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- -------------------------------------------------------------
-- Function privileges
-- -------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.list_public_orders(text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.save_order(jsonb, uuid) to authenticated;
grant execute on function public.add_payment(uuid, integer, date, text, text) to authenticated;
grant execute on function public.delete_payment(uuid) to authenticated;
grant execute on function public.preview_family_subsidy(text, uuid) to authenticated;
