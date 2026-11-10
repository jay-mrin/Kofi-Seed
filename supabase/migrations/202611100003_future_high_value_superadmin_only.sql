-- User's final prospective rule: 10 Nov 2026, 21:30:40 Asia/Kolkata.
-- Never alter records or assignments created before this fixed timestamp.
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

-- Catch orders arriving after the user's cutoff but before rollout. Payment
-- amounts, collecting routes, digital orders and all earlier assignments remain intact.
update public.donations
set social_source = null,
    social_source_manually_assigned = false,
    social_source_verified_at = null,
    social_source_verified_by = null
where amount >= 55 and created_at >= timestamptz '2026-11-10 16:00:40+00';
