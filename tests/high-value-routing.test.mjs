import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const socialRules = read("supabase/functions/_shared/social-source.ts")
  .replace(/^export type .*;\n/gm, "")
  .replaceAll("export ", "")
  .replaceAll("value: unknown", "value")
  .replaceAll("amountCents: number", "amountCents")
  .replaceAll(": SocialSource | null", "");
const moneyParser = read("supabase/functions/_shared/paypal.ts")
  .match(/export function parseMoneyToCents[\s\S]*?\n\}/)[0]
  .replace("export ", "").replace("value: unknown", "value");

async function checkout(functionName, body) {
  const writes = [];
  const paypalOrders = [];
  const deletions = [];
  let handler;
  const supabase = {
    from(table) {
      let inserted;
      const query = {
        select() { return query; },
        eq() { return query; },
        in() { return query; },
        lt() { return query; },
        limit() { return query; },
        delete() { deletions.push(table); return query; },
        insert(value) { inserted = value; writes.push({ table, value }); return query; },
        async maybeSingle() {
          return { data: table === "site_settings"
            ? { settings: { seedPrice: 11 } }
            : { id: "plan", paypal_product_id: "product", paypal_plan_id: "P-EXAMPLE" }, error: null };
        },
        async single() {
          assert.ok(inserted);
          return { data: { id: table === "memberships" ? "membership" : "attempt", checkout_token: "checkout-token" }, error: null };
        },
        then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
  const source = read(`supabase/functions/${functionName}/index.ts`)
    .replace(/^import[\s\S]*?;\n/gm, "")
    .replace(/^type \w+ = \{[\s\S]*?\};\n/gm, "")
    .replaceAll("export ", "")
    .replaceAll("value: string", "value")
    .replaceAll('paymentRoute: "standard" | "superadmin"', "paymentRoute")
    .replaceAll("amountCents: number", "amountCents")
    .replaceAll(" as Record<string, unknown>", "")
    .replace(/readJson<\w+>/g, "readJson");
  const context = vm.createContext({
    Deno: { serve(callback) { handler = callback; } },
    withCors: (callback) => callback,
    handleOptions: () => null,
    readJson: async () => body,
    jsonResponse: (value, status = 200) => ({ status, body: value }),
    errorResponse: (error, status = 400, details) => ({ status, body: { error, details } }),
    getSupabaseAdmin: () => supabase,
    getRandomOrderRequest: () => "Writing request",
    getRitual: (tier) => tier === "199" ? { priceCents: 19900, itemName: "Ritual" } : null,
    getPayPalCurrency: () => "USD",
    centsToMoney: (cents) => cents / 100,
    createPayPalOrder: async (value) => { paypalOrders.push(value); return { id: "ORDER", status: "CREATED" }; },
    createPayPalSubscriptionProduct: async () => { throw new Error("Unexpected plan creation"); },
    createPayPalWeeklyPlan: async () => { throw new Error("Unexpected plan creation"); },
  });
  vm.runInContext(`${socialRules}\n${moneyParser}\n${source}`, context);
  return { response: await handler({ method: "POST" }), writes, paypalOrders, deletions };
}

test("starting checkout preserves expired attempt history for delayed payment recovery", async () => {
  const { response, deletions } = await checkout("create-paypal-order", {
    amount: 11, name: "Customer", email: "customer@example.invalid", paymentRoute: "standard",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(deletions, []);
});

for (const functionName of ["create-paypal-order", "prepare-paypal-subscription"]) {
  test(`${functionName} enforces the $55 account and assignment boundary on the server`, async () => {
    for (const amount of [54.99, 55, 55.01, 110]) {
      const { response, writes, paypalOrders } = await checkout(functionName, {
        amount, name: "Customer", email: "customer@example.invalid", paymentRoute: "standard", sourceTag: "anshu",
      });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const high = amount >= 55;
      assert.equal(response.body.paymentRoute, high ? "superadmin" : "standard");
      assert.ok(writes.length);
      for (const { value } of writes) {
        assert.equal(value.payment_route, high ? "superadmin" : "standard");
        assert.equal(value.social_source, high ? null : "anshu");
        assert.equal(value.amount, amount);
      }
      for (const order of paypalOrders) assert.equal(order.paymentRoute, high ? "superadmin" : "standard");
    }
  });
}

test("ritual account routing uses the server product price rather than a supplied lower amount", async () => {
  const { response, writes } = await checkout("create-paypal-order", {
    amount: 11, name: "Customer", email: "customer@example.invalid", message: "For family",
    productType: "ritual", ritualTier: "199", paymentRoute: "standard", sourceTag: "badal",
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.paymentRoute, "superadmin");
  assert.equal(writes[0].value.amount, 199);
  assert.equal(writes[0].value.social_source, null);
});

test("the legacy Dodo creation endpoint cannot create new $55+ orders", async () => {
  for (const details of [{ seedCount: 5 }, { seedCount: 10 }, { ritualTier: "199" }]) {
    const { response, writes, paypalOrders } = await checkout("create-dodo-checkout", {
      ...details, name: "Customer", email: "customer@example.invalid", message: "For family",
      donorAccessToken: "a".repeat(64),
    });
    assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.equal(writes.length, 0);
    assert.equal(paypalOrders.length, 0);
  }
});

test("$55+ disables the external custom card option while lower orders retain it", () => {
  const source = read("src/app.js").match(/function isCustomCardCheckoutAvailable\(\) \{[\s\S]*?\n\}/)[0];
  const context = vm.createContext({
    visitorCountry: "US",
    state: { settings: { alternateCardCheckoutVisible: true } },
    elements: { amountInput: { value: "54.99" }, supportCard: { parentElement: {} }, superAdminCheckoutHost: {} },
  });
  vm.runInContext(source, context);
  assert.equal(context.isCustomCardCheckoutAvailable(), true);
  context.elements.amountInput.value = "55";
  assert.equal(context.isCustomCardCheckoutAvailable(), false);
  context.elements.amountInput.value = "110";
  assert.equal(context.isCustomCardCheckoutAvailable(), false);
});

test("migration retains existing assignments and guards future high-value recurring and one-time inserts", () => {
  const sql = read("supabase/migrations/202611100001_high_value_social_review.sql");
  assert.match(sql, /set social_source_manually_assigned = true\s+where amount >= 55 and social_source in \('anshu', 'badal'\)/);
  assert.match(sql, /if new\.amount >= 55 and not new\.social_source_manually_assigned then\s+new\.social_source := null;\s+return new;/);
  assert.match(sql, /new\.membership_id is not null[\s\S]*select social_source into new\.social_source/);
  assert.doesNotMatch(sql, /delete from|truncate|set\s+(?:amount|payment_route|social_source)\s*=/i);
});
