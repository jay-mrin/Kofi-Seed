-- Historical Admin PayPal orders predate the redeemed-ebook feature and must
-- retain their original empty Redeemed field. Assignments begin with Dodo.
update public.digital_orders as orders
set redeemed_book_title = null
from public.donations as donations
where orders.donation_id = donations.id
  and donations.payment_route = 'standard'
  and donations.visibility_scope = 'public'
  and donations.payment_method = 'paypal'
  and orders.created_at < '2026-10-18 00:00:00+00'::timestamptz
  and orders.redeemed_book_title is not null;

create or replace function public.assign_admin_redeemed_ebook()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_seed_count integer;
begin
  if new.redeemed_book_title is not null
     or coalesce(new.item_name, '') like 'Digital Book -%' then
    return new;
  end if;

  select donations.seed_count into v_seed_count
  from public.donations
  where donations.id = new.donation_id
    and donations.payment_route = 'standard'
    and donations.visibility_scope = 'public'
    and donations.payment_method = 'dodo';

  if v_seed_count is not null then
    new.redeemed_book_title := public.pick_redeemed_ebook(v_seed_count);
  end if;
  return new;
end;
$$;
