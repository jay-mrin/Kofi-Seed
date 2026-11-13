-- Add Alok without modifying existing orders, payment attempts, or memberships.
alter table public.payment_attempts
  drop constraint payment_attempts_social_source_check,
  add constraint payment_attempts_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit', 'alok'));
alter table public.memberships
  drop constraint memberships_social_source_check,
  add constraint memberships_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit', 'alok'));
alter table public.donations
  drop constraint donations_social_source_check,
  add constraint donations_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit', 'alok'));
alter table public.social_portal_profiles
  drop constraint social_portal_profiles_social_source_check,
  add constraint social_portal_profiles_social_source_check
    check (social_source in ('anshu', 'badal', 'rohit', 'alok'));

-- Alok has no historical or manual-assignment exception for high-value orders.
alter table public.donations
  add constraint donations_alok_amount_check
    check (social_source is distinct from 'alok' or amount < 55);
