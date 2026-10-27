-- Ritual orders have their own item name and do not redeem an ebook.
create or replace function public.assign_admin_redeemed_ebook()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_seed_count integer;
begin
  if new.redeemed_book_title is not null
     or coalesce(new.item_name, '') like 'Digital Book -%'
     or exists (
       select 1 from public.donations
       where id = new.donation_id
         and raw_payment#>>'{product,type}' = 'ritual'
     ) then
    return new;
  end if;

  select donations.seed_count into v_seed_count
  from public.donations
  where donations.id = new.donation_id
    and donations.payment_route = 'standard'
    and donations.visibility_scope = 'public';

  if v_seed_count is not null then
    new.redeemed_book_title := public.pick_redeemed_ebook(v_seed_count);
  end if;
  return new;
end;
$$;
