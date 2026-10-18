-- Add Dodo Payments as the Admin-owned checkout while keeping PayPal scoped to
-- SuperAdmin. Provider-specific identifiers are kept separate so neither
-- gateway can be mistaken for the other during confirmation or cleanup.
alter table public.donations
  drop constraint if exists donations_payment_method_paypal_only_check;

alter table public.donations
  add constraint donations_payment_method_check
  check (payment_method in ('paypal', 'dodo')) not valid;

alter table public.payment_attempts
  add column if not exists payment_provider text not null default 'paypal',
  add column if not exists dodo_checkout_session_id text,
  add column if not exists dodo_payment_id text,
  add column if not exists donor_token_hash text;

alter table public.payment_attempts
  drop constraint if exists payment_attempts_payment_provider_check;

alter table public.payment_attempts
  add constraint payment_attempts_payment_provider_check
  check (payment_provider in ('paypal', 'dodo')) not valid;

create unique index if not exists payment_attempts_dodo_checkout_session_uidx
  on public.payment_attempts (dodo_checkout_session_id)
  where dodo_checkout_session_id is not null;

create unique index if not exists payment_attempts_dodo_payment_uidx
  on public.payment_attempts (dodo_payment_id)
  where dodo_payment_id is not null;

alter table public.donations
  add column if not exists dodo_checkout_session_id text,
  add column if not exists dodo_payment_id text;

create unique index if not exists donations_dodo_checkout_session_uidx
  on public.donations (dodo_checkout_session_id)
  where dodo_checkout_session_id is not null;

create unique index if not exists donations_dodo_payment_uidx
  on public.donations (dodo_payment_id)
  where dodo_payment_id is not null;

alter table public.digital_orders
  add column if not exists payment_provider text not null default 'paypal',
  add column if not exists provider_order_id text,
  add column if not exists provider_transaction_id text;

alter table public.digital_orders
  drop constraint if exists digital_orders_payment_provider_check;

alter table public.digital_orders
  add constraint digital_orders_payment_provider_check
  check (payment_provider in ('paypal', 'dodo')) not valid;

update public.digital_orders
set payment_provider = 'paypal',
    provider_order_id = coalesce(provider_order_id, paypal_order_id),
    provider_transaction_id = coalesce(provider_transaction_id, paypal_capture_id)
where payment_provider = 'paypal';

create index if not exists digital_orders_provider_transaction_idx
  on public.digital_orders (provider_transaction_id);

create table if not exists public.dodo_webhook_events (
  webhook_id text primary key,
  event_type text not null,
  dodo_payment_id text,
  received_at timestamptz not null default now()
);

alter table public.dodo_webhook_events enable row level security;
revoke all on table public.dodo_webhook_events from anon, authenticated;
