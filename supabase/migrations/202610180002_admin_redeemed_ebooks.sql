-- Assign one eligible paid ebook to each Admin seed order. The assignment is
-- saved with the order so it does not change when the calendar is reopened.
alter table public.digital_orders
  add column if not exists redeemed_book_title text;

create or replace function public.pick_redeemed_ebook(p_seed_count integer)
returns text
language sql
volatile
set search_path = public
as $$
  select books.title
  from (values
    ('Hands That Built the Morning', 1),
    ('Letters from the Monsoon', 2),
    ('Midnight Radio Diaries', 3),
    ('Notes from a Quiet Classroom', 4),
    ('Portraits of the Night Train', 5),
    ('Seeds Beneath Concrete', 6),
    ('The Language of Clay', 7),
    ('The Memory of Rivers', 8),
    ('Thirty Steps to the Sea', 9),
    ('Paper Boats in June', 9),
    ('The Lantern at Low Tide', 10),
    ('The Last Blue Bicycle', 11),
    ('The Orchard After Rain', 12),
    ('The Window Garden', 13),
    ('When the Clockmaker Smiled', 14),
    ('Grace in the Waiting Room', 15),
    ('The Chapel of Open Doors', 16),
    ('The Mustard Seed Promise', 17)
  ) as books(title, minimum_seeds)
  where books.minimum_seeds <= p_seed_count
  order by random()
  limit 1;
$$;

revoke all on function public.pick_redeemed_ebook(integer) from public, anon, authenticated;

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
    and donations.visibility_scope = 'public';

  if v_seed_count is not null then
    new.redeemed_book_title := public.pick_redeemed_ebook(v_seed_count);
  end if;
  return new;
end;
$$;

revoke all on function public.assign_admin_redeemed_ebook() from public, anon, authenticated;

drop trigger if exists assign_admin_redeemed_ebook on public.digital_orders;
create trigger assign_admin_redeemed_ebook
before insert on public.digital_orders
for each row execute function public.assign_admin_redeemed_ebook();

update public.digital_orders as orders
set redeemed_book_title = public.pick_redeemed_ebook(donations.seed_count)
from public.donations as donations
where orders.donation_id = donations.id
  and donations.payment_route = 'standard'
  and donations.visibility_scope = 'public'
  and coalesce(orders.item_name, '') not like 'Digital Book -%'
  and orders.redeemed_book_title is null;
