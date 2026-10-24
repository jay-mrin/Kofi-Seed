import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (filePath) => readFileSync(path.join(repositoryRoot, filePath), "utf8");

test("PayPal checkout offers a weekly toggle and preserves one-time payments", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  const webhook = read("supabase/functions/paypal-webhook/index.ts");
  assert.match(html, /id="messageInput"[\s\S]*<strong>Sow Seed Weekly<\/strong>[\s\S]*id="weeklySeedToggle"[\s\S]*id="paypalContinueButton"[^>]*>Continue To Seed<\/button>/);
  assert.doesNotMatch(html, /weeklySeedHint|Pay now, then every Monday|Off: one-time payment/);
  assert.match(app, /function continueWithPayPal\(\)[\s\S]*frequency: elements\.weeklySeedToggle\.checked \? "weekly" : "once"/);
  assert.match(app, /buildPayPalSubscriptionButtonOptions[\s\S]*createSubscription:/);
  assert.match(app, /prepare-paypal-subscription/);
  assert.match(app, /confirm-paypal-subscription/);
  assert.match(app, /intent: weekly \? "subscription" : "capture"/);
  assert.match(webhook, /handleSubscriptionWebhook/);
});

test("weekly plan preparation uses SuperAdmin and Monday 7:30 AM IST", () => {
  const prepare = read("supabase/functions/prepare-paypal-subscription/index.ts");
  const paypal = read("supabase/functions/_shared/paypal.ts");

  assert.match(prepare, /const paymentRoute = "superadmin"/);
  assert.match(prepare, /const daysUntilMonday = \(8 - istDay\) % 7/);
  assert.match(prepare, /Date\.UTC\([\s\S]*2,[\s\S]*0,[\s\S]*0/);
  assert.match(prepare, /if \(monday <= now\) monday\.setUTCDate\(monday\.getUTCDate\(\) \+ 7\)/);
  assert.match(prepare, /amountCents !== seedCount \* seedPriceCents/);
  assert.match(paypal, /interval_unit: "WEEK"/);
  assert.match(paypal, /setup_fee:[\s\S]*setup_fee_failure_action: "CANCEL"/);
});

test("the first recurring charge targets the next Monday at 7:30 AM IST", () => {
  const prepare = read("supabase/functions/prepare-paypal-subscription/index.ts");
  const source = prepare.match(/export function getNextMondayBillingAt\(now = new Date\(\)\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const getNextMondayBillingAt = vm.runInNewContext(
    `const IST_OFFSET_MINUTES = 330; ${source.replace("export ", "")}; getNextMondayBillingAt`,
  );
  assert.equal(getNextMondayBillingAt(new Date("2026-10-24T10:00:00Z")).toISOString(), "2026-10-26T02:00:00.000Z");
  assert.equal(getNextMondayBillingAt(new Date("2026-10-26T01:00:00Z")).toISOString(), "2026-10-26T02:00:00.000Z");
  assert.equal(getNextMondayBillingAt(new Date("2026-10-26T02:00:00Z")).toISOString(), "2026-11-02T02:00:00.000Z");
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
