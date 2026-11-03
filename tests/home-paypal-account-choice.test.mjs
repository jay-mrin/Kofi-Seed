import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("Home and both tagged links use the selected PayPal account while the portal uses SuperAdmin", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  const routeSource = app.match(/function getCheckoutRoute\(\) \{[\s\S]*?\n\}/)?.[0];
  const clientSource = app.match(/function getPayPalClientId\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(routeSource && clientSource);
  assert.match(html, /id="homeSuperAdminPayPal"[^>]*value="superadmin"[\s\S]*<strong>Superadmin\[Paypal\]<\/strong>/);
  assert.match(html, /id="homeAdminPayPal"[^>]*value="standard"[\s\S]*<strong>Admin\[Paypal\]<\/strong>/);

  const host = {};
  const supportCard = { parentElement: {} };
  const context = {
    window: { location: { pathname: "/" } },
    elements: { supportCard, superAdminCheckoutHost: host },
    state: { settings: { homepagePayPalRoute: "standard" } },
    paymentConfig: {
      adminPayPalClientId: "admin-client",
      homepagePayPalClientId: "admin-client",
      superAdminPayPalClientId: "private-superadmin-client",
    },
  };
  const readRoute = () => vm.runInNewContext(
    `${routeSource}\n${clientSource}\n({ route: getCheckoutRoute(), clientId: getPayPalClientId() })`,
    context,
  );

  assert.deepEqual({ ...readRoute() }, { route: "standard", clientId: "admin-client" });
  context.window.location.pathname = "/sowseed";
  assert.deepEqual({ ...readRoute() }, { route: "standard", clientId: "admin-client" });
  context.window.location.pathname = "/seed";
  assert.deepEqual({ ...readRoute() }, { route: "standard", clientId: "admin-client" });
  context.window.location.pathname = "/";
  context.state.settings.homepagePayPalRoute = "superadmin";
  context.paymentConfig.homepagePayPalClientId = "public-superadmin-client";
  assert.deepEqual({ ...readRoute() }, { route: "superadmin", clientId: "public-superadmin-client" });
  context.window.location.pathname = "/sowseed";
  assert.deepEqual({ ...readRoute() }, { route: "superadmin", clientId: "public-superadmin-client" });
  context.window.location.pathname = "/seed";
  assert.deepEqual({ ...readRoute() }, { route: "superadmin", clientId: "public-superadmin-client" });
  supportCard.parentElement = host;
  context.state.settings.homepagePayPalRoute = "standard";
  assert.deepEqual({ ...readRoute() }, { route: "superadmin", clientId: "private-superadmin-client" });
});

test("only SuperAdmin can save the Home account choice without changing orders", () => {
  const settings = read("supabase/functions/admin-settings/index.ts");
  const bootstrap = read("supabase/functions/public-bootstrap/index.ts");
  const migration = read("supabase/migrations/202610310002_home_paypal_account_choice.sql");

  assert.match(settings, /adminProfile\.role === "super_admin"[\s\S]*submittedSettings\.homepagePayPalRoute/);
  assert.match(settings, /selectedCheckout\(currentSettings\)/);
  assert.match(bootstrap, /homepagePayPalClientId: getPayPalClientId\(homepageRoute\)/);
  assert.match(migration, /update public\.site_settings/);
  assert.doesNotMatch(migration, /\b(?:donations|digital_orders|payment_attempts)\b/);
});
