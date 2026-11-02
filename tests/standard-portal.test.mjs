import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import vm from "node:vm";

test("standard transactions are authenticated and expose only successful names, amounts, and dates", () => {
  const source = readFileSync(new URL("../supabase/functions/standard-transactions/index.ts", import.meta.url), "utf8");
  assert.match(source, /requireAdmin\(request, \{ allowedRoles: \["standard"\] \}\)/);
  assert.match(source, /request\.method !== "GET"/);
  assert.match(source, /\.select\("display_name, amount, created_at"\)/);
  assert.match(source, /\.eq\("paypal_status", "COMPLETED"\)/);
  assert.match(source, /\.eq\("payment_route", "standard"\)/);
  assert.match(source, /\.eq\("visibility_scope", "public"\)/);
  assert.match(source, /\.in\("payment_method", \["paypal", "dodo"\]\)/);
  assert.match(source, /\.eq\("digital_orders.fulfillment_status", "fulfilled"\)/);
  assert.match(source, /return jsonResponse\(\{ transactions \}\)/);
  assert.doesNotMatch(source, /raw_payment|payer_email|supporter_message|order_number|contact_email/);
});

async function loadTransactions(rows, enabled) {
  let handler;
  const source = readFileSync(new URL("../supabase/functions/standard-transactions/index.ts", import.meta.url), "utf8")
    .replace(/^import .*;\n/gm, "")
    .replace("const transactions: Array<{ name: string; amount: number; createdAt: string }>", "const transactions");
  const supabase = {
    from(table) {
      const filters = [];
      const query = {
        select() { return query; },
        eq(key, value) { filters.push((row) => (key === "digital_orders.fulfillment_status" ? row.digital_orders?.fulfillment_status : row[key]) === value); return query; },
        in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
        gte(key, value) { filters.push((row) => row[key] >= value); return query; },
        lt(key, value) { filters.push((row) => row[key] < value); return query; },
        order() { return query; },
        async range(start, end) { return { data: rows.filter((row) => filters.every((filter) => filter(row))).slice(start, end + 1) }; },
        async maybeSingle() { assert.equal(table, "site_settings"); return { data: { settings: { superAdminStandardPreviewEnabled: enabled } } }; },
      };
      return query;
    },
  };
  vm.runInNewContext(source, {
    Deno: { serve(callback) { handler = callback; } },
    withCors: (callback) => callback,
    requireAdmin: async (_request, options) => {
      assert.deepEqual(Array.from(options.allowedRoles), ["standard"]);
      return { supabase };
    },
    handleOptions: () => null,
    jsonResponse: (body) => new Response(JSON.stringify(body)),
    errorResponse: (message, status) => new Response(message, { status }),
    URL, Response,
  });
  const response = await handler({ method: "GET", url: "https://local.invalid/standard-transactions?month=2026-11" });
  assert.equal(response.status, 200);
  return (await response.json()).transactions;
}

test("SuperAdmin preview excludes November 3 and earlier even if fulfilled later, and returns only limited fields", async () => {
  const order = (name, createdAt, fulfillment = "fulfilled", status = "COMPLETED") => ({
    display_name: name, amount: 11, created_at: createdAt,
    payment_route: "superadmin", visibility_scope: "superadmin_private", payment_method: "paypal", paypal_status: status,
    digital_orders: { fulfillment_status: fulfillment, fulfilled_at: "2026-11-05T00:00:00.000Z" },
    contact_email: "private@example.invalid", raw_payment: { secret: true },
  });
  const rows = [
    order("Older", "2026-11-01T00:00:00.000Z"),
    order("November 2", "2026-11-02T18:29:59.999Z"),
    order("November 3 midnight", "2026-11-02T18:30:00.000Z"),
    order("November 3 last millisecond", "2026-11-03T18:29:59.999Z"),
    order("November 4 midnight", "2026-11-03T18:30:00.000Z"),
    order("Unfulfilled", "2026-11-04T12:00:00.000Z", "paid_awaiting_personalized_writing"),
    order("Failed", "2026-11-04T13:00:00.000Z", "fulfilled", "FAILED"),
    order("December", "2026-11-30T18:30:00.000Z"),
    { ...order("Admin", "2026-11-02T00:00:00.000Z"), payment_route: "standard", visibility_scope: "public" },
  ];
  const transactions = await loadTransactions(rows, true);
  assert.deepEqual(transactions.map((row) => row.name), ["Admin", "November 4 midnight"]);
  for (const row of transactions) assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "name"]);
  assert.deepEqual((await loadTransactions(rows, false)).map((row) => row.name), ["Admin"]);
  assert.deepEqual((await loadTransactions(rows, "false")).map((row) => row.name), ["Admin"]);
  assert.deepEqual((await loadTransactions(rows, undefined)).map((row) => row.name), ["Admin", "November 4 midnight"]);
});

test("standard sign in loads only the limited calendar", () => {
  const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(source, /if \(state\.adminProfile\?\.role === "standard"\) \{\s*openStandardPanel\(\);\s*await loadStandardTransactions\(\);\s*\} else \{\s*openAdminPanel\(\)/);
  assert.match(source, /async function refreshAdminPortalData\(\) \{\s*if \(state\.adminProfile\?\.role === "standard"\) \{\s*await loadStandardTransactions\(\);\s*return;/);
  assert.ok(html.indexOf('id="standardPanel"') < html.indexOf('id="adminPanel"'));
  assert.match(html, /id="standardPanel"[\s\S]*id="standardCalendarGrid"[\s\S]*<\/section>\s*<\/section>\s*<section class="admin-panel" id="adminPanel"/);
});
