-- The public goal follows confirmed seed payments across days and gateways.
-- Return cents to keep the $700 rollover exact.
create or replace function public.get_confirmed_seed_total_cents()
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(greatest(round(d.amount * 100), 0)), 0)::bigint
  from public.donations as d
  where d.paypal_status = 'COMPLETED'
    and d.payment_method in ('paypal', 'dodo')
    and d.payment_route in ('standard', 'superadmin')
    and d.raw_payment->>'mode' is distinct from 'test'
    and d.raw_payment#>>'{product,type}' is distinct from 'book';
$$;

revoke all on function public.get_confirmed_seed_total_cents() from public, anon, authenticated;
grant execute on function public.get_confirmed_seed_total_cents() to service_role;
