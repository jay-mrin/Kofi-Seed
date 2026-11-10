-- Add approval evidence without altering existing order amounts, source tags,
-- payment routes, or relationships. The v2 API bounds legacy access at the
-- original rule commit: 10 Nov 2026 00:38:45 Asia/Kolkata, not deployment time.
alter table public.donations
  add column if not exists social_source_verified_at timestamptz,
  add column if not exists social_source_verified_by uuid references auth.users(id) on delete set null;

-- Every new high-value order starts unassigned. Verification happens through
-- an authenticated SuperAdmin update after the order has been recorded.
create or replace function public.set_weekly_order_social_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount >= 55 then
    new.social_source := null;
    new.social_source_manually_assigned := false;
    new.social_source_verified_at := null;
    new.social_source_verified_by := null;
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
