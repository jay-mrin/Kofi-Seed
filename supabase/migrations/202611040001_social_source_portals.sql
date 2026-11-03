-- New attribution is nullable, preserving every existing payment and order.
alter table public.payment_attempts add column if not exists social_source text;
alter table public.memberships add column if not exists social_source text;
alter table public.donations add column if not exists social_source text;

alter table public.payment_attempts
  add constraint payment_attempts_social_source_check
  check (social_source is null or social_source in ('anshu', 'badal'));
alter table public.memberships
  add constraint memberships_social_source_check
  check (social_source is null or social_source in ('anshu', 'badal'));
alter table public.donations
  add constraint donations_social_source_check
  check (social_source is null or social_source in ('anshu', 'badal'));

create index if not exists donations_social_source_created_at_idx
  on public.donations (social_source, created_at desc)
  where social_source is not null;

-- Separate from admin_profiles so social accounts gain no admin RLS privileges.
create table if not exists public.social_portal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  social_source text not null unique check (social_source in ('anshu', 'badal')),
  created_at timestamptz not null default now()
);
alter table public.social_portal_profiles enable row level security;
revoke all on public.social_portal_profiles from anon, authenticated;

-- Weekly orders inherit the source of the subscription that produced them.
create or replace function public.set_weekly_order_social_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.membership_id is not null and new.social_source is null then
    select social_source into new.social_source
    from public.memberships
    where id = new.membership_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_weekly_order_social_source on public.donations;
create trigger set_weekly_order_social_source
before insert on public.donations
for each row execute function public.set_weekly_order_social_source();
