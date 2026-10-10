create or replace function public.record_weekly_subscription_payment(
  p_membership_id uuid,
  p_transaction_id text,
  p_amount numeric,
  p_currency text,
  p_paid_at timestamptz,
  p_fortune_id bigint,
  p_fortune_message text,
  p_order_number text,
  p_raw_payment jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.memberships%rowtype;
  v_donation_id uuid;
  v_payment_kind text;
begin
  if nullif(trim(p_transaction_id), '') is null or p_amount <= 0 then
    raise exception 'A transaction id and positive amount are required.';
  end if;

  select * into v_membership
  from public.memberships
  where id = p_membership_id and frequency = 'weekly'
  for update;

  if not found then
    raise exception 'Weekly membership was not found.';
  end if;

  select id into v_donation_id
  from public.donations
  where provider_transaction_id = p_transaction_id;

  if v_donation_id is null then
    insert into public.donations (
      display_name,
      amount,
      seed_count,
      frequency,
      supporter_message,
      payment_method,
      paypal_payer_email,
      paypal_status,
      payment_route,
      visibility_scope,
      fortune_id,
      fortune_message,
      membership_id,
      provider_transaction_id,
      raw_payment,
      created_at
    ) values (
      v_membership.customer_name,
      p_amount,
      v_membership.seed_count,
      'weekly',
      v_membership.customer_request,
      'paypal',
      v_membership.customer_email,
      'COMPLETED',
      v_membership.payment_route,
      case when v_membership.payment_route = 'superadmin' then 'superadmin_private' else 'public' end,
      p_fortune_id,
      p_fortune_message,
      v_membership.id,
      p_transaction_id,
      coalesce(p_raw_payment, '{}'::jsonb),
      coalesce(p_paid_at, now())
    )
    returning id into v_donation_id;
  elsif not exists (
    select 1 from public.donations
    where id = v_donation_id and membership_id = v_membership.id
  ) then
    raise exception 'Subscription transaction belongs to another membership.';
  end if;

  insert into public.digital_orders (
    order_number,
    donation_id,
    customer_name,
    contact_email,
    payer_email,
    amount,
    currency,
    item_name,
    personalized_request,
    blessing_message,
    fulfillment_status,
    created_at
  ) values (
    p_order_number,
    v_donation_id,
    v_membership.customer_name,
    v_membership.customer_email,
    v_membership.customer_email,
    p_amount,
    upper(p_currency),
    'Personalised Digital Writing - Custom Order Made Writing',
    coalesce(v_membership.personalized_request, v_membership.customer_request),
    p_fortune_message,
    'paid_awaiting_personalized_writing',
    coalesce(p_paid_at, now())
  )
  on conflict (donation_id) do nothing;

  v_payment_kind := case
    when v_membership.successful_payment_count = 0 then 'initial'
    when v_membership.status in ('past_due', 'suspended') then 'retry'
    else 'renewal'
  end;

  insert into public.membership_payments (
    membership_id,
    paypal_transaction_id,
    amount,
    currency,
    status,
    payment_kind,
    donation_id,
    paid_at,
    raw_payment
  ) values (
    v_membership.id,
    p_transaction_id,
    p_amount,
    upper(p_currency),
    'COMPLETED',
    v_payment_kind,
    v_donation_id,
    coalesce(p_paid_at, now()),
    coalesce(p_raw_payment, '{}'::jsonb)
  )
  on conflict (paypal_transaction_id) do nothing;

  perform public.refresh_membership_payment_summary(v_membership.id);
  return v_donation_id;
end;
$$;

revoke all on function public.record_weekly_subscription_payment(uuid, text, numeric, text, timestamptz, bigint, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_weekly_subscription_payment(uuid, text, numeric, text, timestamptz, bigint, text, text, jsonb) to service_role;

drop trigger if exists touch_memberships_updated_at on public.memberships;
create trigger touch_memberships_updated_at
before update on public.memberships
for each row execute function public.touch_updated_at();

-- Remove only the retired progress feature; payment/order records remain intact.
drop table if exists public.meter_applied_donations;
drop function if exists public.reconcile_standard_meter_after_delete();
drop function if exists public.apply_standard_donation_to_meter(uuid, numeric);
drop function if exists public.reconcile_standard_meter();

update public.site_settings
set settings = settings - array[
  'seedGoal', 'startingSeeds', 'meterCurrentAmount',
  'meterHeadline', 'meterCollapsed', 'meterExpanded'
]::text[]
where id = true;
