update public.site_settings
set settings = settings - 'checkoutRoute' - 'highPaymentSuperAdminEnabled'
where id = true;
