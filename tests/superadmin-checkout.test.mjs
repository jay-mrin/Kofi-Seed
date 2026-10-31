import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (filePath) => readFileSync(path.join(repositoryRoot, filePath), "utf8");

test("Admin and SuperAdmin PayPal orders and weekly plans use separate routes", () => {
  const app = read("src/app.js");
  const order = read("supabase/functions/create-paypal-order/index.ts");
  const weekly = read("supabase/functions/prepare-paypal-subscription/index.ts");
  const bootstrap = read("supabase/functions/public-bootstrap/index.ts");
  const profile = read("supabase/functions/admin-profile/index.ts");
  const paypal = read("supabase/functions/_shared/paypal.ts");

  assert.match(app, /function getCheckoutRoute\(\)[\s\S]*elements\.supportCard\?\.parentElement === elements\.superAdminCheckoutHost/);
  assert.match(order, /body\.paymentRoute === "superadmin"[\s\S]*body\.paymentRoute === "standard"/);
  assert.match(weekly, /body\.paymentRoute === "superadmin"[\s\S]*body\.paymentRoute === "standard"/);
  assert.match(bootstrap, /adminPayPalClientId: getPayPalClientId\("standard"\)/);
  assert.doesNotMatch(bootstrap, /superAdminPayPalClientId/);
  assert.match(profile, /adminProfile\.role === "super_admin"[\s\S]*getPayPalClientId\("superadmin"\)/);
  assert.match(paypal, /paymentRoute === "standard"[\s\S]*ADMIN_PAYPAL_ENV[\s\S]*PAYPAL_ENV/);
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
  assert.match(app, /function placePayPalCheckoutInPortal\(inPortal\)[\s\S]*superAdminCheckoutHost\.appendChild\(elements\.supportCard\)[\s\S]*supportHomeColumn\.insertBefore\(elements\.supportCard, elements\.supportRitualCard\)[\s\S]*elements\.supportCard\.hidden = !inPortal && !state\.settings\.paypalCheckoutVisible/);
  assert.match(app, /placePayPalCheckoutInPortal\(isSuperAdmin\)/);
  assert.match(app, /function closeAdminPanel\(\) \{\s*clearAdminSession\(\);\s*placePayPalCheckoutInPortal\(false\)/);
  assert.match(app, /const inSuperAdminPortal = elements\.supportCard\.parentElement === elements\.superAdminCheckoutHost;[\s\S]*elements\.supportCard\.hidden = !inSuperAdminPortal && !settings\.paypalCheckoutVisible/);
});
