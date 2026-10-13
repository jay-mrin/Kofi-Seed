update public.site_settings
set settings = (
  coalesce(settings, '{}'::jsonb) - 'mockCheckoutVisible'
) || jsonb_build_object(
  'dodoCheckoutVisible', coalesce(
    settings->'dodoCheckoutVisible',
    settings->'mockCheckoutVisible',
    'true'::jsonb
  ),
  'paypalCheckoutVisible', coalesce(
    settings->'paypalCheckoutVisible',
    'true'::jsonb
  )
)
where id = true;
