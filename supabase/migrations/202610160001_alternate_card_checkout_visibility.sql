update public.site_settings
set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
  'alternateCardCheckoutVisible', coalesce(
    settings->'alternateCardCheckoutVisible',
    'true'::jsonb
  )
)
where id = true;
