-- Preserve existing payments, order relationships, source tags and payment routes.
-- Existing assigned orders remain visible in their current social portal.
alter table public.donations
  add column if not exists social_source_manually_assigned boolean not null default false;

-- Grandfather all current $55+ assignments without changing their source or route.
update public.donations
set social_source_manually_assigned = true
where amount >= 55 and social_source in ('anshu', 'badal');

-- Cover recurring charges from existing memberships and captures of older attempts.
-- Automatic source inheritance must never assign an order of $55 or more.
create or replace function public.set_weekly_order_social_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount >= 55 and not new.social_source_manually_assigned then
    new.social_source := null;
    return new;
  end if;
  if new.membership_id is not null and new.social_source is null then
    select social_source into new.social_source
    from public.memberships
    where id = new.membership_id;
  end if;
  return new;
end;
$$;
