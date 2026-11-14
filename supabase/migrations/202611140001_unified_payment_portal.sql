-- A read-only aggregate identity; existing partner profiles and orders are untouched.
create table public.unified_payment_portal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  login_username text not null unique
    check (login_username = lower(login_username) and length(login_username) between 1 and 128),
  display_name text not null default 'Unified Payment Portal',
  created_at timestamptz not null default now()
);
alter table public.unified_payment_portal_profiles enable row level security;
revoke all on public.unified_payment_portal_profiles from anon, authenticated;
