-- Keep the saved checkout price in step with the $11 seed and $1,100 goal.
update public.site_settings
set settings = jsonb_set(settings, '{seedPrice}', '11'::jsonb, true)
where id = true;
