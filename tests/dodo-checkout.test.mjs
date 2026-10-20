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
  assert.match(dodo, /\.\.\.\(input\.email \? \{ customer:/);
  assert.match(dodo, /minimal_address: true/);
  assert.match(dodo, /single_page: true/);
  assert.match(dodo, /redirect_immediately: true/);
  assert.match(dodo, /allow_phone_number_collection: false/);
  assert.match(dodo, /checkout_attempt_id: input\.attemptId/);
});

test("Sow Your Seed opens Dodo directly", () => {
  const html = read("index.html");
  const checkout = read("src/home-dodo-checkout.js");
  const app = read("src/app.js");

  assert.match(html, /id="dodoCheckoutButton"[^>]*>Sow Your Spiritual Seed Now<\/button>/);
  assert.doesNotMatch(html, /id="dodoPaymentDialog"|id="dodoPayButton"|id="dodoCustomerEmail"/);
  assert.match(checkout, /checkoutButton\.textContent = "Sow Your Spiritual Seed Now"/);
  assert.match(checkout, /form\.addEventListener\("submit"[\s\S]*startDodoCheckout\(\)/);
  assert.match(checkout, /const startDodoCheckout = async \(\) => \{[\s\S]*create-dodo-checkout/);
  assert.match(checkout, /window\.location\.assign\(payload\.checkoutUrl\)/);
  assert.doesNotMatch(checkout, /emailInput|paymentDialog/);
  assert.match(app, /document\.querySelector\("#seedCheckoutCard"\)/);
  assert.match(app, /document\.querySelector\("#dodoCheckoutButton"\)/);
});

test("seed checkout appears above the cover and profile heading without an extra button", () => {
  const html = read("index.html");
  const styles = read("src/styles.css");

  assert.doesNotMatch(html, /class="profile-support-button"/);
  assert.ok(html.indexOf('id="homeView"') < html.indexOf('id="seedCheckoutCard"'));
  assert.ok(html.indexOf('id="seedCheckoutCard"') < html.indexOf('class="cover-frame"'));
  assert.ok(html.indexOf('class="cover-frame"') < html.indexOf("Finding Love - Soulmate - Protection"));
  assert.ok(html.indexOf("Finding Love - Soulmate - Protection") < html.indexOf('id="support-story"'));
  assert.match(styles, /\.support-page-grid \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
});

test("seed amount sits beside the quantity control on narrow screens", () => {
  const html = read("index.html");
  const styles = read("src/styles.css");

  assert.match(html, /id="dodoIncreaseSeeds"[\s\S]*class="dodo-total"[\s\S]*id="dodoCheckoutButton"/);
  assert.match(styles, /\.home-checkout-view \.dodo-checkout-summary \.dodo-total \{\s*grid-column: 2;\s*grid-row: 1;/);
  assert.match(styles, /\.home-checkout-view \.dodo-checkout-summary \.dodo-name-field \{\s*grid-column: 1 \/ -1;/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) clamp\(76px, 27%, 100px\)/);
});

test("Dodo checkout does not offer an alternate card popup", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  assert.doesNotMatch(html, /id="dodoAlternateCardCheckoutLink"|id="dodoCardButton"/);
  assert.doesNotMatch(app, /dodoAlternateCardCheckoutLink|dodoCardButton/);
});

test("Dodo payment confirmation verifies provider state before creating an order", () => {
  const orders = read("supabase/functions/_shared/dodo-orders.ts");

  assert.match(orders, /payment\.status !== "succeeded"/);
  assert.match(orders, /metadata\.checkout_attempt_id[\s\S]*attempt\.id/);
  assert.match(orders, /Number\(payment\.total_amount\) < expectedCents/);
  assert.match(orders, /payment_method: "dodo"/);
  assert.match(orders, /payment_route: "standard"/);
  assert.match(orders, /const payerEmail = String\(payment\.customer\?\.email \|\| attempt\.contact_email/);
  assert.match(orders, /contact_email: payerEmail/);
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
