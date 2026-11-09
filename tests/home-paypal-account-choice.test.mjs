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
  const routeSource = app.match(/function getCheckoutRoute\([^)]*\) \{[\s\S]*?\n\}/)?.[0];
  const clientSource = app.match(/function getPayPalClientId\([^)]*\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(routeSource && clientSource);
  assert.match(html, /id="homeSuperAdminPayPal"[^>]*value="superadmin"[\s\S]*<strong>SuperAdmin PayPal<\/strong>/);
  assert.match(html, /id="homeAdminPayPal"[^>]*value="standard"[\s\S]*<strong>Admin PayPal<\/strong>/);
  assert.match(html, /id="homeCustomCreditDebit"[^>]*value="custom"[\s\S]*<strong>Custom Credit Debit<\/strong>/);
  assert.doesNotMatch(html, /id="alternateCardCheckoutVisible" type="checkbox"/);
  assert.match(app, /getCheckoutDisplaySelection\(\)/);

  const host = {};
  const supportCard = { parentElement: {} };
  const context = {
    window: { location: { pathname: "/" } },
    elements: { supportCard, superAdminCheckoutHost: host, amountInput: { value: "11" } },
    state: { settings: { homepagePayPalRoute: "standard" } },
    paymentConfig: {
      adminPayPalClientId: "admin-client",
      homepagePayPalClientId: "admin-client",
      superAdminPayPalClientId: "private-superadmin-client",
      highValuePayPalClientId: "high-value-superadmin-client",
    },
  };
  const readRoute = () => vm.runInNewContext(
    `${routeSource}\n${clientSource}\n({ route: getCheckoutRoute(), clientId: getPayPalClientId() })`,
    context,
  );

  assert.deepEqual({ ...readRoute() }, { route: "standard", clientId: "admin-client" });
  for (const amount of ["55", "55.01", "110"]) {
    context.elements.amountInput.value = amount;
    assert.deepEqual({ ...readRoute() }, { route: "superadmin", clientId: "high-value-superadmin-client" });
  }
  context.elements.amountInput.value = "54.99";
  assert.deepEqual({ ...readRoute() }, { route: "standard", clientId: "admin-client" });
  context.elements.amountInput.value = "11";
  const explicitRitualRoute = vm.runInNewContext(
    `${routeSource}\n${clientSource}\n({ route: getCheckoutRoute(199), clientId: getPayPalClientId(199) })`, context,
  );
  assert.deepEqual({ ...explicitRitualRoute }, { route: "superadmin", clientId: "high-value-superadmin-client" });
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

test("saved checkout choice selects exactly one SuperAdmin control", () => {
  const app = read("src/app.js");
  const renderSource = app.match(/function renderAdminForm\(\) \{[\s\S]*?\n\}/)?.[0];
  const selectionSource = app.match(/function getCheckoutDisplaySelection\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(renderSource && selectionSource);
  const controls = Object.fromEntries(["homeSuperAdminPayPal", "homeAdminPayPal", "homeCustomCreditDebit"]
    .map((id) => [`#${id}`, { checked: false }]));
  const context = vm.createContext({
    document: { querySelector: (selector) => controls[selector] },
    elements: {},
    state: { settings: { homepagePayPalRoute: "standard", alternateCardCheckoutVisible: false } },
  });
  vm.runInContext(renderSource, context);
  const selected = () => Object.entries(controls).filter(([, control]) => control.checked).map(([id]) => id);

  context.renderAdminForm();
  assert.deepEqual(selected(), ["#homeAdminPayPal"]);
  context.state.settings.homepagePayPalRoute = "superadmin";
  context.renderAdminForm();
  assert.deepEqual(selected(), ["#homeSuperAdminPayPal"]);
  context.state.settings.alternateCardCheckoutVisible = true;
  context.renderAdminForm();
  assert.deepEqual(selected(), ["#homeCustomCreditDebit"]);

  for (const [choice, expected] of [
    ["standard", { homepagePayPalRoute: "standard", alternateCardCheckoutVisible: false }],
    ["superadmin", { homepagePayPalRoute: "superadmin", alternateCardCheckoutVisible: false }],
    ["custom", { homepagePayPalRoute: "superadmin", alternateCardCheckoutVisible: true }],
  ]) {
    const saved = vm.runInNewContext(`${selectionSource}\ngetCheckoutDisplaySelection()`, {
      document: { querySelector: () => ({ value: choice }) },
    });
    assert.deepEqual({ ...saved }, expected);
  }
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
