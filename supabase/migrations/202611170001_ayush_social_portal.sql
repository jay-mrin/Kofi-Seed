-- Ayush replaces explicit partner hiding; no collecting or provider data changes.
alter table public.payment_attempts
  drop constraint payment_attempts_social_source_check,
  add constraint payment_attempts_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit', 'alok', 'ayush'));
alter table public.memberships
  drop constraint memberships_social_source_check,
  add constraint memberships_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit', 'alok', 'ayush'));
alter table public.donations
  drop constraint donations_social_source_check,
  add constraint donations_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit', 'alok', 'ayush'));
alter table public.social_portal_profiles
  drop constraint social_portal_profiles_social_source_check,
  add constraint social_portal_profiles_social_source_check
    check (social_source in ('anshu', 'badal', 'rohit', 'alok', 'ayush'));

-- Ayush uses the same dated boundary as existing partner portals.
alter table public.donations
  add constraint donations_ayush_amount_check
    check (social_source is distinct from 'ayush' or (amount > 0 and
      amount < (case when created_at < timestamptz '2026-11-16 18:30:00+00' then 55 else 33 end)));

-- Server-only username lookup; existing partner email logins stay unchanged.
alter table public.social_portal_profiles
  add column login_username text unique
    check (login_username is null or
      (login_username = lower(login_username) and length(login_username) between 1 and 128));

-- Only the old Hide button produced this combination for eligible paid orders.
-- Ordinary untagged payments, other partners, subscriptions and payment attempts
-- are deliberately excluded. Only attribution changes; history stays intact.
update public.donations
set social_source = 'ayush'
where social_source is null
  and social_source_manually_assigned = true
  and payment_method = 'paypal'
  and paypal_status = 'COMPLETED'
  and created_at >= timestamptz '2026-11-15 18:30:00+00'
  and amount > 0
  and amount < (case when created_at < timestamptz '2026-11-16 18:30:00+00' then 55 else 33 end)
  and payment_route in ('standard', 'superadmin')
  and visibility_scope in ('public', 'superadmin_private');
