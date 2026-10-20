-- This goal cycle began on 19 October 2026 (India time). Older orders
-- predate the current $700 goal and must not consume its first cycle.
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
    and d.created_at >= '2026-10-18 18:30:00+00'::timestamptz
    and d.raw_payment->>'mode' is distinct from 'test'
    and d.raw_payment#>>'{product,type}' is distinct from 'book';
$$;
