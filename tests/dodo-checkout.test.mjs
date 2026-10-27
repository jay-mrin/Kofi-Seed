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
  assert.match(dodo, /pdt_0Nq0zMUDbiKtD9EKOLkMD/);
  assert.match(create, /product_id: productId/);
  assert.match(create, /unitPrice = Math\.max\(Number\(settingsRow\?\.settings\?\.seedPrice\) \|\| 11, 11\)/);
});

test("Sow Your Seed opens a details and payment-options dialog", () => {
  const html = read("index.html");
  const checkout = read("src/home-dodo-checkout.js");
  const app = read("src/app.js");

  assert.match(html, /id="dodoCheckoutButton"[^>]*aria-controls="dodoPaymentDialog"[^>]*>Sow Your Spiritual Seed Now<\/button>/);
  assert.match(html, /id="dodoPaymentDialog"[\s\S]*id="dodoCustomerEmail"[\s\S]*id="dodoCustomerMessage"[\s\S]*id="dodoPaymentPanel"[\s\S]*id="dodoCardButton"[\s\S]*id="dodoPayButton"/);
  assert.match(checkout, /checkoutButton\.textContent = "Sow Your Spiritual Seed Now"/);
  assert.match(checkout, /form\.addEventListener\("submit"[\s\S]*paymentDialog\.showModal\(\)/);
  assert.match(checkout, /const startDodoCheckout = async \(\) => \{[\s\S]*create-dodo-checkout/);
  assert.match(checkout, /dodoPayButton\.addEventListener\("click", \(\) => void startDodoCheckout\(\)\)/);
  assert.match(checkout, /paymentDialog\.addEventListener\("cancel"[\s\S]*closePaymentDialog\(\)/);
  assert.match(app, /elements\.dodoCardButton\.hidden = !settings\.alternateCardCheckoutVisible/);
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

  assert.match(html, /id="dodoIncreaseSeeds"[\s\S]*class="dodo-total"[\s\S]*id="dodoCustomerName"/);
  assert.match(styles, /\.home-checkout-view \.dodo-checkout-summary \.dodo-total \{\s*grid-column: 2;\s*grid-row: 1;/);
  assert.match(styles, /\.home-checkout-view \.dodo-checkout-summary \.dodo-name-field \{\s*grid-column: 1 \/ -1;/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) clamp\(76px, 27%, 100px\)/);
});

test("the first Dodo card option stays disabled after one opening", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  const closeCheckout = app.match(/function closeAlternateCheckout\(\) \{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(html, /id="dodoPayButton"[^>]*>Sow Your Seed Now ➡️<\/button>/);
  assert.match(html, /class="dodo-payment-guidance">Complete The Payment To Get Your Seed<\/p>/);
  assert.match(read("src/styles.css"), /\.dodo-payment-guidance \{[\s\S]*color: #1f1f1f;[\s\S]*font-weight: 800;/);
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
