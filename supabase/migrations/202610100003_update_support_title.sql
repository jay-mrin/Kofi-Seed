update public.site_settings
set settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{supportTitle}',
  to_jsonb('Buy a Seed to Sow for the Love 💗💕'::text),
  true
)
where id = true;
