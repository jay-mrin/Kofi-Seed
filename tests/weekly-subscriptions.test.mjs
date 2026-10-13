import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (filePath) => readFileSync(path.join(repositoryRoot, filePath), "utf8");

test("public checkout offers one-time payments while existing subscription processing remains", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  const webhook = read("supabase/functions/paypal-webhook/index.ts");
  assert.doesNotMatch(html, /weeklySeedToggle|Sow Seed Every Week/);
  assert.doesNotMatch(app, /chooseWeeklySowing|buildPayPalSubscriptionButtonOptions|createSubscription:/);
  assert.match(app, /intent: "capture"/);
  assert.match(webhook, /handleSubscriptionWebhook/);
});

test("weekly plan preparation uses SuperAdmin and Monday 6 PM IST", () => {
  const prepare = read("supabase/functions/prepare-paypal-subscription/index.ts");
  const paypal = read("supabase/functions/_shared/paypal.ts");

  assert.match(prepare, /const paymentRoute = "superadmin"/);
  assert.match(prepare, /istDay === 1 \? 7/);
  assert.match(prepare, /12,[\s\S]*30,[\s\S]*0/);
  assert.match(prepare, /amountCents !== seedCount \* seedPriceCents/);
  assert.match(paypal, /interval_unit: "WEEK"/);
  assert.match(paypal, /setup_fee:[\s\S]*setup_fee_failure_action: "CANCEL"/);
});

test("subscription webhooks create idempotent weekly orders and track failures", () => {
  const subscriptions = read("supabase/functions/_shared/subscriptions.ts");
  const webhook = read("supabase/functions/paypal-webhook/index.ts");
  const migration = read("supabase/migrations/202608290001_weekly_subscriptions.sql");

  assert.match(webhook, /isSubscriptionWebhook[\s\S]*handleSubscriptionWebhook/);
  assert.match(subscriptions, /PAYMENT\.SALE\.COMPLETED/);
  assert.match(subscriptions, /BILLING\.SUBSCRIPTION\.PAYMENT\.FAILED/);
  assert.match(subscriptions, /membership_webhook_events/);
  assert.match(subscriptions, /record_weekly_subscription_payment/);
  assert.match(migration, /create table if not exists public\.memberships/);
  assert.match(migration, /create or replace function public\.record_weekly_subscription_payment/);
  assert.match(migration, /on conflict \(paypal_transaction_id\) do nothing/);
});

test("Subscription backend remains route scoped", () => {
  const admin = read("supabase/functions/admin-subscriptions/index.ts");

  assert.match(admin, /adminProfile\.role === "super_admin"[\s\S]*"superadmin"[\s\S]*"standard"/);
  assert.match(admin, /\.eq\("payment_route", paymentRoute\)/);
  assert.match(admin, /cancelPayPalSubscription/);
});
