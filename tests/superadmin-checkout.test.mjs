import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (filePath) => readFileSync(path.join(repositoryRoot, filePath), "utf8");

test("new PayPal orders and weekly plans use SuperAdmin", () => {
  const app = read("src/app.js");
  const order = read("supabase/functions/create-paypal-order/index.ts");
  const weekly = read("supabase/functions/prepare-paypal-subscription/index.ts");
  const bootstrap = read("supabase/functions/public-bootstrap/index.ts");

  assert.match(app, /function getCheckoutRoute\(\)\s*\{\s*return "superadmin";/);
  assert.match(order, /const paymentRoute = "superadmin";/);
  assert.match(order, /body\.paymentRoute !== paymentRoute/);
  assert.match(weekly, /const paymentRoute = "superadmin";/);
  assert.match(weekly, /body\.paymentRoute !== paymentRoute/);
  assert.match(bootstrap, /superAdminPayPalClientId: getPayPalClientId\("superadmin"\)/);
  assert.doesNotMatch(bootstrap, /paypalClientId: getPayPalClientId\(\)/);
});

test("legacy Admin records and webhooks remain available", () => {
  const admin = read("supabase/functions/admin-donations/index.ts");
  const capture = read("supabase/functions/capture-paypal-order/index.ts");
  const paypal = read("supabase/functions/_shared/paypal.ts");

  assert.match(admin, /payment_route", "standard"/);
  assert.match(capture, /paymentAttempt\.payment_route === "superadmin"/);
  assert.match(paypal, /const routes = \["superadmin", "standard"\]/);
});

test("SuperAdmin Checkout keeps the PayPal form independent of the Home display choice", () => {
  const html = read("index.html");
  const app = read("src/app.js");

  assert.match(html, /id="superAdminPayPalSection" hidden>[\s\S]*<strong>Checkout<\/strong>[\s\S]*id="superAdminCheckoutHost"/);
  assert.ok(html.indexOf('id="superAdminCheckoutHost"') < html.indexOf('id="adminForm"'));
  assert.match(app, /function placePayPalCheckoutInPortal\(inPortal\)[\s\S]*destination\.appendChild\(elements\.supportCard\)[\s\S]*elements\.supportCard\.hidden = !inPortal && !state\.settings\.paypalCheckoutVisible/);
  assert.match(app, /placePayPalCheckoutInPortal\(isSuperAdmin\)/);
  assert.match(app, /function closeAdminPanel\(\) \{\s*placePayPalCheckoutInPortal\(false\)/);
  assert.match(app, /const inSuperAdminPortal = elements\.supportCard\.parentElement === elements\.superAdminCheckoutHost;[\s\S]*elements\.supportCard\.hidden = !inSuperAdminPortal && !settings\.paypalCheckoutVisible/);
});
