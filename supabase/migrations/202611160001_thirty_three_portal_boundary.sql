-- New portal policy without rewriting, deleting, or rerouting existing orders.
-- APIs decide visibility from amount and the 16-Nov India-time start date.
create or replace function public.enforce_future_high_value_social_exclusion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount >= 33 then
    -- Retain untouched historical tags, but never accept a new high-value tag.
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
        raise exception 'Orders of $33 or more cannot be assigned to another portal';
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
  if new.amount >= 33 then
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

-- These tables are served through role-filtered Edge Functions. Retire older
-- direct-browser grants so historical $33+ rows cannot bypass the API policy.
-- Service-role access and all stored rows remain unchanged.
revoke all on table public.payment_attempts, public.seed_comments from anon, authenticated;
