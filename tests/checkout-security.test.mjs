import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("PayPal capture trusts the server-pinned payment attempt", () => {
  const source = read("supabase/functions/capture-paypal-order/index.ts");

  assert.match(source, /\.from\("payment_attempts"\)/);
  assert.match(source, /paymentAttempt\.payment_route/);
  assert.match(source, /capturedAmountCents !== parseMoneyToCents\(paymentAttempt\.amount\)/);
  assert.doesNotMatch(source, /body\.donation|paypal_checkout_sessions|resolvePaymentRoute/);
});

test("PayPal creation accepts only the SuperAdmin SDK route and persists checkout metadata", () => {
  const source = read("supabase/functions/create-paypal-order/index.ts");

  assert.match(source, /const paymentRoute = "superadmin"/);
  assert.match(source, /body\.paymentRoute !== paymentRoute/);
  assert.match(source, /\.from\("payment_attempts"\)\s*\.insert/);
  assert.match(source, /customer_request: personalizedRequest/);
});

test("book captures remain private from the seed feed", () => {
  const capture = read("supabase/functions/capture-paypal-order/index.ts");
  const bootstrap = read("supabase/functions/public-bootstrap/index.ts");

  assert.match(capture, /paymentAttempt\.product_type === "book"/);
  assert.match(capture, /paymentRoute === "superadmin" \|\| isBookOrder[\s\S]*ensureSeedComment/);
  assert.match(bootstrap, /rawPayment\.product\?\.type !== "book"/);
});

test("Admin order reads and mutations share the same role scope", () => {
  const source = read("supabase/functions/admin-donations/index.ts");
  const scopeCalls = source.match(/applyAdminDonationScope\(/g) || [];

  assert.ok(scopeCalls.length >= 4, "GET, PUT, DELETE, and the helper must all use the shared role scope");
  assert.match(source, /role === "super_admin"[\s\S]*payment_route", "superadmin"[\s\S]*visibility_scope", "superadmin_private"/);
  assert.match(source, /payment_route", "standard"[\s\S]*visibility_scope", "public"[\s\S]*\.in\("payment_method", \["paypal", "dodo"\]\)/);
});

test("webhooks can recover completed captures without trusting browser metadata", () => {
  const source = read("supabase/functions/paypal-webhook/index.ts");

  assert.match(source, /supplementary_data\?\.related_ids\?\.order_id/);
  assert.match(source, /\.from\("payment_attempts"\)/);
  assert.match(source, /functions\.invoke\(\s*"capture-paypal-order"/);
  assert.match(source, /attemptRoute !== verifiedRoute/);
});

test("declined PayPal instruments remain retryable across API, browser, and webhook handling", () => {
  const paypal = read("supabase/functions/_shared/paypal.ts");
  const capture = read("supabase/functions/capture-paypal-order/index.ts");
  const webhook = read("supabase/functions/paypal-webhook/index.ts");
  const app = read("src/app.js");

  assert.match(paypal, /class PayPalApiError extends Error/);
  assert.match(paypal, /const captureRequestId = `\$\{orderId\}-\$\{crypto\.randomUUID\(\)\}`/);
  assert.doesNotMatch(paypal, /"PayPal-Request-Id": orderId/);
  assert.match(capture, /error\.issue === "INSTRUMENT_DECLINED"/);
  assert.match(capture, /failure_reason: error\.issue/);
  assert.match(capture, /status: "started"/);
  assert.match(capture, /captures\.find\(\(capture\) => capture\?\.status === "COMPLETED"\)/);
  assert.match(capture, /captures\.at\(-1\)/);
  assert.match(app, /onApprove: async \(data\)/);
  assert.match(app, /error\?\.code === "INSTRUMENT_DECLINED"/);
  assert.match(app, /INSTRUMENT_DECLINED[\s\S]*closeInlinePayPalCheckout\(\)[\s\S]*openPaymentFailure\("paypal"\)/);
  assert.match(webhook, /eventType !== "PAYMENT\.CAPTURE\.COMPLETED"/);
  assert.match(webhook, /lastCaptureWebhook: event/);
  assert.match(webhook, /PAYMENT_CAPTURE_\$\{normalizedStatus\}/);
});

test("cleanup migrations close direct-table bypasses and remove retired schema", () => {
  const integrityMigration = read("supabase/migrations/202608180006_checkout_integrity.sql");
  const cleanupMigration = read("supabase/migrations/202608180007_remove_dead_checkout_fields.sql");

  for (const policy of [
    "Admins can manage settings",
    "Admins can read digital orders",
    "Admins can update digital orders",
    "Admins can read checkout events",
  ]) {
    assert.ok(integrityMigration.includes(`drop policy if exists \"${policy}\"`));
  }

  for (const table of [
    "membership_webhook_events",
    "membership_payments",
    "memberships",
    "membership_plans",
    "community_story_likes",
    "community_stories",
  ]) {
    assert.ok(cleanupMigration.includes(`drop table if exists public.${table}`));
  }
});

test("checkout analytics combine visits while isolating all payment records by route", () => {
  const analytics = read("supabase/functions/admin-analytics/index.ts");
  const app = read("src/app.js");
  const html = read("index.html");
  const bootstrap = read("supabase/functions/public-bootstrap/index.ts");
  const migration = read("supabase/migrations/202608180008_admin_checkout_analytics.sql");
  const roleScopeMigration = read("supabase/migrations/202608190001_role_scoped_checkout_analytics.sql");

  assert.match(analytics, /\.from\("payment_attempts"\)/);
  assert.match(analytics, /adminProfile\.role === "super_admin"/);
  assert.match(analytics, /\.from\("page_views"\)[\s\S]*\.in\("payment_route", \["standard", "superadmin"\]\)/);
  assert.match(analytics, /\.eq\("payment_route", paymentRoute\)/);
  assert.doesNotMatch(analytics, /oppositeRoute|oppositeCompleted/);
  assert.match(analytics, /\.from\("checkout_analytics_state"\)/);
  assert.match(analytics, /contact_email/);
  assert.match(analytics, /paymentStartsLast24h: attempts\.length/);
  assert.match(analytics, /Only SuperAdmin can subtract page views/);
  assert.match(analytics, /\.from\("page_views"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("id", latestView\.id\)/);
  assert.match(app, /decrementPageViewButton/);
  assert.match(html, /aria-label="Subtract one page view"/);
  assert.doesNotMatch(analytics, /"cancelled"/);
  assert.doesNotMatch(app, /displayStatus === "cancelled"/);
  assert.doesNotMatch(app, /\["completed", "cancelled", "not_completed"\]/);
  assert.doesNotMatch(app, /completed \$\{oppositeRouteLabel\} payments/);
  assert.doesNotMatch(html, /completed SuperAdmin payments/);
  assert.doesNotMatch(analytics, /checkout_button_clicked|paypal_checkout_started/);
  assert.match(bootstrap, /payment_route: paymentRoute/);
  assert.match(migration, /add column if not exists payment_route text/);
  assert.match(roleScopeMigration, /payment_route text primary key/);
  assert.match(roleScopeMigration, /revoke all on table public\.checkout_analytics_state from anon, authenticated/);
});

test("progress retirement preserves the weekly payment transaction and removes its dependency", () => {
  const original = read("supabase/migrations/202608290001_weekly_subscriptions.sql");
  const cleanup = read("supabase/migrations/202610100001_remove_progress_feature.sql");
  const signature = "create or replace function public.record_weekly_subscription_payment(";
  const expected = original.slice(original.indexOf(signature)).replace(
    /  if v_membership\.payment_route = 'standard' then\n    perform public\.apply_standard_donation_to_meter\(v_donation_id, p_amount\);\n  end if;\n\n/,
    "",
  );
  assert.ok(cleanup.startsWith(expected));
  assert.match(cleanup, /drop table if exists public\.meter_applied_donations;/);
  assert.match(cleanup, /drop function if exists public\.apply_standard_donation_to_meter\(uuid, numeric\);/);
  assert.doesNotMatch(cleanup, /drop table[^;]*(?:public\.donations|public\.digital_orders|public\.membership_payments)/);
});

test("shop retirement rejects new products but recovers existing book payments from stored metadata", () => {
  const create = read("supabase/functions/create-paypal-order/index.ts");
  const capture = read("supabase/functions/capture-paypal-order/index.ts");
  const app = read("src/app.js");
  assert.match(create, /requestedProductType !== "seed" && requestedProductType !== "personalized_seed_writing"/);
  assert.ok(create.indexOf('return errorResponse("This product is no longer available."') < create.indexOf("await createPayPalOrder("));
  assert.match(capture, /paymentAttempt\.product_type === "book"[\s\S]*attemptRawPayment\.product\?\.title[\s\S]*attemptRawPayment\.product\?\.itemName/);
  assert.doesNotMatch(capture, /getBookProduct|selected book is no longer available/);
  assert.match(app, /isBookOrder \? "Mark delivered" : "Mark fulfilled"/);
  assert.match(app, /isBook \? "Delivered by email" : "Fulfilled"/);
});
