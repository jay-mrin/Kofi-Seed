-- The homepage goal counts public seed purchases from the current campaign.
-- Private SuperAdmin/PayPal orders are deliberately excluded.
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
    and d.payment_route = 'standard'
    and d.visibility_scope = 'public'
    and d.created_at >= '2026-10-17 18:30:00+00'::timestamptz
    and d.raw_payment->>'mode' is distinct from 'test'
    and d.raw_payment#>>'{product,type}' = 'seed';
$$;
