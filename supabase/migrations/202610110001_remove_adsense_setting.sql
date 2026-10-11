update public.site_settings
set settings = coalesce(settings, '{}'::jsonb) - 'adsenseEnabled'
where id = true
  and coalesce(settings, '{}'::jsonb) ? 'adsenseEnabled';
