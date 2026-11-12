-- Add Rohit without rewriting any existing order, payment, or membership.
-- Include additive prerequisites for production installations where the older
-- 202611100001-3 data migrations have not been authorized/applied.
alter table public.donations
  add column if not exists social_source_manually_assigned boolean not null default false,
  add column if not exists social_source_verified_at timestamptz,
  add column if not exists social_source_verified_by uuid references auth.users(id) on delete set null;

alter table public.payment_attempts
  drop constraint payment_attempts_social_source_check,
  add constraint payment_attempts_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit'));
alter table public.memberships
  drop constraint memberships_social_source_check,
  add constraint memberships_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit'));
alter table public.donations
  drop constraint donations_social_source_check,
  add constraint donations_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit'));
alter table public.social_portal_profiles
  drop constraint social_portal_profiles_social_source_check,
  add constraint social_portal_profiles_social_source_check
    check (social_source in ('anshu', 'badal', 'rohit'));

-- Rohit has no historical $55+ exception. Existing Anshu and Badal history
-- and the fixed prospective exclusion remain unchanged.
alter table public.donations
  add constraint donations_rohit_amount_check
    check (social_source is distinct from 'rohit' or amount < 55);

-- Install the current policy for future writes only. Never clean up or rewrite
-- existing source tags; the API independently excludes disallowed high values.
create or replace function public.enforce_future_high_value_social_exclusion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount >= 55 and new.created_at >= timestamptz '2026-11-10 16:00:40+00' then
    new.social_source := null;
    new.social_source_manually_assigned := false;
    new.social_source_verified_at := null;
    new.social_source_verified_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_future_high_value_social_exclusion on public.donations;
create trigger enforce_future_high_value_social_exclusion
before insert or update of amount, created_at, social_source, social_source_manually_assigned,
  social_source_verified_at, social_source_verified_by on public.donations
for each row execute function public.enforce_future_high_value_social_exclusion();

create or replace function public.set_weekly_order_social_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount >= 55 and new.created_at >= timestamptz '2026-11-10 16:00:40+00' then
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
