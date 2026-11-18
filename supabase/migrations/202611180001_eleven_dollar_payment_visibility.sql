-- Only exact multiples of $11 below the original dated limit may be tagged.
-- Replace future-write guards only; existing payment rows and routes stay intact.
create or replace function public.enforce_future_high_value_social_exclusion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if mod(new.amount, 11) <> 0 or new.amount >= (case when new.created_at < timestamptz '2026-11-16 18:30:00+00' then 55 else 33 end) then
    -- Retain untouched historical tags; APIs hide newly excluded amounts.
    if tg_op = 'UPDATE' then
      if new.social_source is not distinct from old.social_source
        and new.social_source_manually_assigned is not distinct from old.social_source_manually_assigned
        and new.social_source_verified_at is not distinct from old.social_source_verified_at
        and new.social_source_verified_by is not distinct from old.social_source_verified_by
        and new.amount is not distinct from old.amount
        and new.created_at is not distinct from old.created_at then
        return new;
      end if;
      if new.social_source is not null then
        raise exception 'Only multiples of $11 below the dated limit can be assigned to another portal';
      end if;
    end if;
    new.social_source := null;
    new.social_source_manually_assigned := false;
    new.social_source_verified_at := null;
    new.social_source_verified_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.set_weekly_order_social_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if mod(new.amount, 11) <> 0 or new.amount >= (case when new.created_at < timestamptz '2026-11-16 18:30:00+00' then 55 else 33 end) then
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
