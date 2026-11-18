-- Add Himanshu without modifying any existing payment, source or membership.
-- /garden changes only the attribution of newly started frontend checkouts.
alter table public.payment_attempts
  drop constraint payment_attempts_social_source_check,
  add constraint payment_attempts_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit', 'alok', 'ayush', 'himanshu'));
alter table public.memberships
  drop constraint memberships_social_source_check,
  add constraint memberships_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit', 'alok', 'ayush', 'himanshu'));
alter table public.donations
  drop constraint donations_social_source_check,
  add constraint donations_social_source_check
    check (social_source is null or social_source in ('anshu', 'badal', 'rohit', 'alok', 'ayush', 'himanshu'));
alter table public.social_portal_profiles
  drop constraint social_portal_profiles_social_source_check,
  add constraint social_portal_profiles_social_source_check
    check (social_source in ('anshu', 'badal', 'rohit', 'alok', 'ayush', 'himanshu'));

-- The same exact-$11 and original India-date limits apply to this new portal.
alter table public.donations
  add constraint donations_himanshu_eligibility_check
    check (social_source is distinct from 'himanshu' or
      (amount > 0 and mod(amount, 11) = 0 and
       amount < (case when created_at < timestamptz '2026-11-16 18:30:00+00' then 55 else 33 end)));
