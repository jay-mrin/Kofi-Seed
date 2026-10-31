-- Select which PayPal account powers Home without changing any order records.
-- Dodo confirmation and webhook endpoints remain available for older payments.
update public.site_settings
set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
  'dodoCheckoutVisible', false,
  'paypalCheckoutVisible', true,
  'homepagePayPalRoute', case
    when settings->>'homepagePayPalRoute' = 'superadmin' then 'superadmin'
    else 'standard'
  end
)
where id = true;
