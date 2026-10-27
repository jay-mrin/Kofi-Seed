import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("ritual prices, Dodo products, and calendar item names stay paired", () => {
  const catalog = read("supabase/functions/_shared/rituals.ts");
  const expected = [
    ["199", "19900", "pdt_0NqfgfmW3N3YEOYOdQeqZ", "The Stories We Left Behind"],
    ["299", "29900", "pdt_0NqfgsCjN9s7aPwZUT3Zp", "Of Little Things & Passing Days"],
    ["399", "39900", "pdt_0Nqfh88mzTwN3HdozCrZ3", "Whisper of Grace"],
    ["499", "49900", "pdt_0NqfhFlg3qTBuktD9n3K2", "Christ Garden Full Collection"],
  ];
  for (const [tier, cents, productId, itemName] of expected) {
    assert.ok(catalog.includes(`"${tier}": {\n    priceCents: ${cents},\n    productId: "${productId}",\n    itemName: "${itemName}"`));
    assert.match(read("index.html"), new RegExp(`ritual-option-price">\\$${tier}<`));
  }
  assert.equal(new Set(expected.map((entry) => entry[2])).size, 4);
});

test("the selected provider handles ritual payment with a catalog priced PayPal order", () => {
  const app = read("src/app.js");
  const create = read("supabase/functions/create-paypal-order/index.ts");
  const capture = read("supabase/functions/capture-paypal-order/index.ts");

  assert.match(app, /if \(state\.settings\.paypalCheckoutVisible\) \{[\s\S]*productType: "ritual"[\s\S]*capture-paypal-order/);
  assert.match(app, /create-dodo-checkout/);
  assert.match(create, /const amountCents = ritual \? ritual\.priceCents : parseMoneyToCents\(body\.amount\)/);
  assert.match(capture, /capturedAmountCents !== ritual\.priceCents/);
  assert.match(capture, /productType: isRitualOrder \? "ritual"/);
});

test("ritual cancellation opens its own retry popup and can reopen the ritual details", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  const dodo = read("src/home-dodo-checkout.js");

  assert.match(html, /id="ritualFailureDialog"[\s\S]*id="retryRitualButton"/);
  assert.match(app, /preview_ritual_failure[\s\S]*openRitualPaymentFailure\(\{ preview: true \}\)/);
  assert.match(app, /onCancel: \(\) => \{[\s\S]*openRitualPaymentFailure\(\)/);
  assert.match(app, /function closeRitualPaymentFailure\(retry = false\)[\s\S]*ritualForm"\)\?\.requestSubmit\(\)/);
  assert.match(dodo, /pendingProductKey\) === "ritual"[\s\S]*openRitualPaymentFailure\?\.\(\)/);
});

test("the completed ritual details button shows a revolving seed while checkout opens", () => {
  const app = read("src/app.js");
  const styles = read("src/styles.css");

  assert.match(app, /function setRitualButtonLoading\(button, loading\)[\s\S]*ritual-loading-seed[\s\S]*Loading…/);
  assert.doesNotMatch(app, /setRitualButtonLoading\(performButton, true\)/);
  assert.match(app, /setRitualButtonLoading\(button, true\)[\s\S]*create-dodo-checkout/);
  assert.match(styles, /@keyframes ritual-seed-revolve[\s\S]*rotate\(360deg\)/);
});

test("ritual checkout is created server-side and verified before recording the mapped item", () => {
  const create = read("supabase/functions/create-dodo-checkout/index.ts");
  const dodo = read("supabase/functions/_shared/dodo.ts");
  const orders = read("supabase/functions/_shared/dodo-orders.ts");
  const app = read("src/app.js");
  assert.match(create, /getRitual\(ritualTier\)/);
  assert.match(create, /product_id: productId/);
  assert.match(dodo, /product_id: input\.productId \|\| getDodoProductId\(\)/);
  assert.match(orders, /attempt\.product_id !== ritual\.productId/);
  assert.match(orders, /item_name: itemName/);
  assert.match(app, /isRitualOrder \? "" : `<span><strong>Status/);
  assert.match(app, /context\.isAdminPortal && !isRitualOrder/);
});

test("ritual details and the recipient reach the order calendar; confirmation uses the ritual receipt", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  const create = read("supabase/functions/create-dodo-checkout/index.ts");
  const orders = read("supabase/functions/_shared/dodo-orders.ts");
  assert.match(html, /id="ritualPaymentTitle">Complete Ritual Detail/);
  assert.match(html, /id="ritualCustomerName"[^>]*required/);
  assert.match(html, /id="ritualCustomerEmail"[^>]*required/);
  assert.match(html, /id="ritualFor"[^>]*required/);
  assert.match(html, /id="ritualContinueButton"[^>]*>Perform Ritual/);
  assert.match(app, /message: ritualForInput\.value/);
  assert.match(create, /if \(ritual && !message\)/);
  assert.match(orders, /personalized_request: attempt\.customer_request/);
  assert.match(app, /<strong>Ritual for<\/strong>\$\{escapeHtml\(request\)\}/);
  assert.match(app, /"Your Ritual is Done"/);
  assert.match(app, /Matthew 19:26/);
});
