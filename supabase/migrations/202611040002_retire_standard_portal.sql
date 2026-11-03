-- Retire the Standard Portal account role without touching payment or order records.
delete from public.admin_profiles where role = 'standard';

alter table public.admin_profiles
  drop constraint if exists admin_profiles_role_check;

alter table public.admin_profiles
  add constraint admin_profiles_role_check
  check (role in ('admin', 'super_admin'));

-- The old preview setting served only the retired portal.
update public.site_settings
set settings = settings - 'superAdminStandardPreviewEnabled'
where settings ? 'superAdminStandardPreviewEnabled';
