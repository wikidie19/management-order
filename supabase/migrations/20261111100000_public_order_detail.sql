-- Public, read-only order detail. Like list_public_orders(), it only exposes
-- non-sensitive data: no WhatsApp number, notes, prices or payment history.
create or replace function public.get_public_order(p_order_number text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'family_name', o.family_name,
    'total_quantity', o.total_quantity,
    'created_at', o.created_at,
    'payment_status', o.payment_status,
    'items', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'item_no', i.item_no,
                 'wearer_name', i.wearer_name,
                 'wearer_type', i.wearer_type,
                 'category', i.category,
                 'size', i.size,
                 'sleeve_type', i.sleeve_type
               )
               order by i.item_no
             )
      from public.order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.order_number = p_order_number;
$$;

revoke execute on function public.get_public_order(text) from public, anon, authenticated;
grant execute on function public.get_public_order(text) to anon, authenticated;
