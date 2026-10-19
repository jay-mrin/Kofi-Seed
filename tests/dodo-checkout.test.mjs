import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(path.join(repositoryRoot, relativePath), "utf8");

test("Dodo checkout is server-created and scoped to Admin", () => {
  const create = read("supabase/functions/create-dodo-checkout/index.ts");
  const dodo = read("supabase/functions/_shared/dodo.ts");

  assert.match(create, /payment_route: "standard"/);
  assert.match(create, /payment_provider: "dodo"/);
  assert.match(create, /site_settings[\s\S]*seedPrice/);
  assert.match(dodo, /product_cart:[\s\S]*amount: input\.amountCents/);
  assert.match(dodo, /allowed_payment_method_types: \["credit", "debit"\]/);
  assert.match(dodo, /minimal_address: true/);
  assert.match(dodo, /single_page: true/);
  assert.match(dodo, /allow_phone_number_collection: false/);
  assert.match(dodo, /checkout_attempt_id: input\.attemptId/);
});

test("Sow Your Seed reveals payment choices before Dodo checkout starts", () => {
  const html = read("index.html");
  const checkout = read("src/home-dodo-checkout.js");
  const app = read("src/app.js");

  assert.match(html, /id="dodoPaymentPanel"[\s\S]*id="dodoCardButton"[\s\S]*id="dodoPayButton"[\s\S]*Complete the payment for Your Seed/);
  assert.match(checkout, /form\.addEventListener\("submit"[\s\S]*paymentPanel\.hidden = false;[\s\S]*dodoPayButton\.focus\(\)/);
  assert.match(checkout, /dodoPayButton\.addEventListener\("click"[\s\S]*create-dodo-checkout/);
  assert.match(app, /elements\.dodoCardButton\.hidden = !settings\.alternateCardCheckoutVisible/);
});

test("the first Dodo card option stays disabled after one opening", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  const closeCheckout = app.match(/function closeAlternateCheckout\(\) \{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(html, /id="dodoPayButton"[^>]*>Credit or Debit Card \(Dodo\)<\/button>/);
  assert.match(app, /\[elements\.alternateCardCheckoutLink, elements\.dodoAlternateCardCheckoutLink\][\s\S]*classList\.add\("is-disabled"\)/);
  assert.match(html, /id="dodoAlternateCardCheckoutLink"[\s\S]*class="alternate-card-retry"[^>]*>Try Again<\/p>/);
  assert.ok(closeCheckout);
  assert.doesNotMatch(closeCheckout, /dodoAlternateCardCheckoutLink/);
  assert.doesNotMatch(closeCheckout, /classList\.remove\("is-disabled"\)/);
});

test("Dodo payment confirmation verifies provider state before creating an order", () => {
  const orders = read("supabase/functions/_shared/dodo-orders.ts");

  assert.match(orders, /payment\.status !== "succeeded"/);
  assert.match(orders, /metadata\.checkout_attempt_id[\s\S]*attempt\.id/);
  assert.match(orders, /Number\(payment\.total_amount\) < expectedCents/);
  assert.match(orders, /payment_method: "dodo"/);
  assert.match(orders, /payment_route: "standard"/);
  assert.match(orders, /visibility_scope: "public"/);
  assert.match(orders, /\.eq\("dodo_payment_id", normalizedPaymentId\)/);
});

test("Dodo webhook verifies signatures and records idempotency keys", () => {
  const shared = read("supabase/functions/_shared/dodo.ts");
  const webhook = read("supabase/functions/dodo-webhook/index.ts");

  assert.match(shared, /webhook-id/);
  assert.match(shared, /webhook-timestamp/);
  assert.match(shared, /crypto\.subtle\.verify/);
  assert.match(shared, /> 300/);
  assert.match(webhook, /dodo_webhook_events/);
  assert.match(webhook, /payment\.succeeded/);
  assert.match(webhook, /finalizeDodoPayment\(paymentId\)/);
});

test("portal ownership keeps Dodo in Admin and PayPal in SuperAdmin", () => {
  const admin = read("supabase/functions/admin-donations/index.ts");
  const paypal = read("supabase/functions/create-paypal-order/index.ts");

  assert.match(admin, /role === "super_admin"[\s\S]*payment_route", "superadmin"/);
  assert.match(admin, /payment_route", "standard"[\s\S]*\.in\("payment_method", \["paypal", "dodo"\]\)/);
  assert.match(paypal, /const paymentRoute = "superadmin"/);
});
