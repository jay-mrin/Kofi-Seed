-- One-time aggregate audit. No donor details or schema changes are emitted.
do $$
declare
  summary jsonb;
begin
  select jsonb_agg(to_jsonb(grouped)) into summary
  from (
    select
      (d.created_at at time zone 'Asia/Kolkata')::date as india_day,
      d.payment_route,
      d.payment_method,
      d.paypal_status,
      d.raw_payment->>'mode' as payment_mode,
      d.raw_payment#>>'{product,type}' as product_type,
      count(*) as payment_count,
      sum(d.seed_count) as seed_count,
      sum(d.amount) as amount
    from public.donations as d
    where d.created_at >= '2026-10-17 18:30:00+00'::timestamptz
    group by 1, 2, 3, 4, 5, 6
    order by 1, 2, 3, 4, 5, 6
  ) as grouped;
  raise notice 'Seed goal aggregate audit: %', summary;
end;
$$;
