-- Route new Home checkout traffic to the Admin PayPal Business account.
-- Existing donations and payment attempts remain untouched; Dodo confirmation
-- and webhook handlers stay available for pending and historical payments.
update public.site_settings
set settings = jsonb_set(
  jsonb_set(coalesce(settings, '{}'::jsonb), '{dodoCheckoutVisible}', 'false'::jsonb, true),
  '{paypalCheckoutVisible}',
  'true'::jsonb,
  true
)
where id = true;
