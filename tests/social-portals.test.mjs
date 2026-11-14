import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const socialRules = read("supabase/functions/_shared/social-source.ts")
  .replace(/^export type .*;\n/gm, "").replaceAll("export ", "")
  .replaceAll("value: unknown", "value").replaceAll("amountCents: number", "amountCents")
  .replaceAll("donation: any", "donation").replaceAll(": SocialSource | null", "");
const { isSocialAssignmentApproved, SOCIAL_HIGH_VALUE_EXCLUSION_START } = vm.runInNewContext(
  `${socialRules}; ({ isSocialAssignmentApproved, SOCIAL_HIGH_VALUE_EXCLUSION_START })`,
);

test("only the current tagged path attributes PayPal checkout", () => {
  const app = read("src/app.js");
  const source = app.match(/function readSocialSourceTag\(\)[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const window = {
    location: { pathname: "/sowseed", search: "" },
  };
  const context = vm.createContext({ window });
  vm.runInContext(source, context);
  assert.equal(context.readSocialSourceTag(), "anshu");
  window.location.pathname = "/seed";
  assert.equal(context.readSocialSourceTag(), "badal");
  window.location.pathname = "/garden";
  assert.equal(context.readSocialSourceTag(), "rohit");
  window.location.pathname = "/garden/";
  assert.equal(context.readSocialSourceTag(), "rohit");
  window.location.pathname = "/sownow";
  assert.equal(context.readSocialSourceTag(), "alok");
  window.location.pathname = "/sownow/";
  assert.equal(context.readSocialSourceTag(), "alok");
  window.location.pathname = "/";
  assert.equal(context.readSocialSourceTag(), null);
  window.location.search = "?campaign=unknown";
  assert.equal(context.readSocialSourceTag(), null);
  assert.equal((app.match(/sourceTag: readSocialSourceTag\(\)/g) || []).length, 3);
  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  const routing = JSON.parse(read("vercel.json"));
  assert.deepEqual(routing.rewrites.map(({ source, destination }) => [source, destination]), [
    ["/sowseed", "/index.html"], ["/seed", "/index.html"], ["/garden", "/index.html"], ["/sownow", "/index.html"],
  ]);
  assert.deepEqual(routing.redirects.map(({ source, destination }) => [source, destination]), [
    ["/sowseed/", "/sowseed"], ["/seed/", "/seed"], ["/garden/", "/garden"], ["/sownow/", "/sownow"],
  ]);
  assert.equal(new URL("src/app.js", "https://example.invalid/sowseed").pathname, "/src/app.js");
});

async function readPortalMonth(rows, token, month = "2026-11") {
  const unified = token === "unified";
  const source = read(`supabase/functions/${unified ? "unified-portal-transactions" : "social-portal-transactions"}/index.ts`)
    .replace(/^import .*;\n/gm, "")
    .replace(
      /const transactions: Array<.*> = \[\];/,
      "const transactions = [];",
    );
  let handler;
  const supabase = {
    from(table) {
      assert.equal(table, "donations");
      const filters = [];
      const query = {
        select(fields) {
          assert.doesNotMatch(fields, /raw_payment|paypal_capture_id|supporter_message|customer_request/);
          return query;
        },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        or(value) {
          assert.equal(value, unified
            ? `amount.lt.55,and(social_source.in.(anshu,badal),created_at.lt.${SOCIAL_HIGH_VALUE_EXCLUSION_START})`
            : `amount.lt.55,created_at.lt.${SOCIAL_HIGH_VALUE_EXCLUSION_START}`);
          filters.push((row) => Number(row.amount) < 55 ||
            ((!unified || ["anshu", "badal"].includes(row.social_source)) && row.created_at < SOCIAL_HIGH_VALUE_EXCLUSION_START));
          return query;
        },
        in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
        gte(key, value) { filters.push((row) => row[key] >= value); return query; },
        lt(key, value) { filters.push((row) => row[key] < value); return query; },
        order() { return query; },
        async range(start, end) {
          return { data: rows.filter((row) => filters.every((filter) => filter(row))).slice(start, end + 1) };
        },
      };
      return query;
    },
  };
  vm.runInNewContext(source, {
    Deno: { serve(callback) { handler = callback; } },
    withCors: (callback) => callback,
    handleOptions: () => null,
    requireSocialPortal: async (request) => {
      const bearer = request.headers.get("Authorization");
      if (!["Bearer anshu", "Bearer badal", "Bearer rohit", "Bearer alok"].includes(bearer)) {
        throw new globalThis.Response("Forbidden", { status: 403 });
      }
      return { supabase, socialSource: bearer.slice(7) };
    },
    requireUnifiedPaymentPortal: async (request) => {
      if (request.headers.get("Authorization") !== "Bearer unified") throw new globalThis.Response("Forbidden", { status: 403 });
      return { supabase };
    },
    jsonResponse: (body) => new globalThis.Response(JSON.stringify(body)),
    errorResponse: (message, status) => new globalThis.Response(message, { status }),
    URL, Response: globalThis.Response,
    isSocialAssignmentApproved, SOCIAL_HIGH_VALUE_EXCLUSION_START,
  });
  const request = new globalThis.Request(`https://local.invalid/social-portal-transactions?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const response = await handler(request);
  return { status: response.status, body: response.status === 200 ? await response.json() : null };
}

test("each social portal sees only its own successful PayPal orders from 4 November in India", async () => {
  const order = (name, source, createdAt, overrides = {}) => ({
    display_name: name,
    social_source: source,
    amount: 11,
    created_at: createdAt,
    paypal_payer_email: `${name.toLowerCase()}@example.invalid`,
    digital_orders: { contact_email: `${name.toLowerCase()}-order@example.invalid` },
    payment_method: "paypal",
    paypal_status: "COMPLETED",
    payment_route: "standard",
    visibility_scope: "public",
    raw_payment: {
      unrelatedPrivateValue: "must not appear",
    },
    ...overrides,
  });
  const rows = [
    order("Earlier", "anshu", "2026-11-03T18:29:59.999Z"),
    order("AnshuFirst", "anshu", "2026-11-03T18:30:00.000Z"),
    order("AnshuSuper", "anshu", "2026-11-04T12:00:00.000Z", {
      payment_route: "superadmin", visibility_scope: "superadmin_private",
    }),
    order("BadalFirst", "badal", "2026-11-04T13:00:00.000Z"),
    order("BelowLimit", "anshu", "2026-11-04T13:10:00.000Z", { amount: 54.99 }),
    order("AtLimit", "anshu", "2026-11-04T13:20:00.000Z", { amount: 55 }),
    order("OverLimit", "badal", "2026-11-04T13:30:00.000Z", { amount: 110 }),
    order("ApprovedHigh", "anshu", "2026-11-04T13:40:00.000Z", { amount: 55, social_source_manually_assigned: true }),
    order("Failed", "anshu", "2026-11-04T14:00:00.000Z", { paypal_status: "FAILED" }),
    order("Dodo", "anshu", "2026-11-04T15:00:00.000Z", { payment_method: "dodo" }),
    order("Untagged", null, "2026-11-04T16:00:00.000Z"),
    order("UntaggedSuper", null, "2026-11-04T17:00:00.000Z", {
      payment_route: "superadmin", visibility_scope: "superadmin_private",
    }),
  ];
  const anshu = await readPortalMonth(rows, "anshu");
  assert.equal(anshu.status, 200);
  assert.deepEqual(anshu.body.transactions.map((row) => row.name), ["AnshuFirst", "AnshuSuper", "BelowLimit", "AtLimit", "ApprovedHigh"]);
  for (const row of anshu.body.transactions) {
    assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "email", "name"]);
    assert.match(row.email, /-order@example\.invalid$/);
  }
  assert.doesNotMatch(JSON.stringify(anshu.body), /unrelatedPrivateValue|must not appear|raw_payment/);

  const badal = await readPortalMonth(rows, "badal");
  assert.deepEqual(badal.body.transactions.map((row) => row.name), ["BadalFirst", "OverLimit"]);
  assert.deepEqual(Object.keys(badal.body.transactions[0]).sort(), ["amount", "createdAt", "email", "name"]);
  assert.deepEqual((await readPortalMonth(rows, "anshu", "2026-10")).body.transactions, []);
  assert.equal((await readPortalMonth(rows, "unknown")).status, 403);
});

test("a new $55 SuperAdmin order stays private even with manual verification", async () => {
  const order = {
    display_name: "Reassigned",
    social_source: null,
    amount: 55,
    social_source_manually_assigned: false,
    created_at: "2026-11-10T16:01:00.000Z",
    paypal_payer_email: "customer@example.invalid",
    digital_orders: { contact_email: "customer@example.invalid" },
    payment_method: "paypal",
    paypal_status: "COMPLETED",
    payment_route: "superadmin",
    visibility_scope: "superadmin_private",
  };
  const rows = [order];
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions, []);
  order.social_source = "anshu";
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions, []);
  order.social_source_manually_assigned = true;
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions, []);
  order.social_source_verified_at = "2026-11-10T06:10:00.000Z";
  order.social_source_verified_by = "superadmin-user";
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions, []);
  assert.deepEqual((await readPortalMonth(rows, "badal")).body.transactions, []);
  order.social_source = "badal";
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions, []);
  assert.deepEqual((await readPortalMonth(rows, "badal")).body.transactions, []);
});

test("social order cards show paid amount without credited details", () => {
  const app = read("src/app.js");
  const styles = read("src/styles.css");
  assert.match(app, /paidLabel\.textContent = "Paid"/);
  assert.match(app, /row\.append\(identity, paid\)/);
  assert.doesNotMatch(app, /Credited|getSocialNetAmount|social-order-amounts/);
  assert.doesNotMatch(styles, /social-order-amounts/);
});

test("the prospective cutoff preserves every earlier assignment and excludes new $55+ orders", async () => {
  const base = {
    display_name: "Future121", amount: 121, social_source: "anshu",
    created_at: "2026-11-10T16:01:00.000Z", social_source_manually_assigned: true,
    social_source_verified_at: "2026-11-10T16:10:00.000Z", social_source_verified_by: "superadmin-user",
    payment_method: "paypal", paypal_status: "COMPLETED",
    payment_route: "superadmin", visibility_scope: "superadmin_private",
    paypal_payer_email: "customer@example.invalid",
  };
  const rows = [
    base,
    { ...base, display_name: "Earlier1133", created_at: "2026-11-10T06:03:00.000Z", social_source_manually_assigned: false },
    { ...base, display_name: "BeforeCutoff121", created_at: "2026-11-10T16:00:39.999Z" },
    { ...base, display_name: "AtCutoff55", amount: 55, created_at: SOCIAL_HIGH_VALUE_EXCLUSION_START },
    { ...base, display_name: "FutureLow", amount: 54.99 },
  ];
  const result = await readPortalMonth(rows, "anshu");
  assert.equal(result.body.socialAssignmentPolicy, "prospective-superadmin-only-v3");
  assert.deepEqual(result.body.transactions.map((row) => row.name), ["Earlier1133", "BeforeCutoff121", "FutureLow"]);
  assert.deepEqual((await readPortalMonth(rows, "badal")).body.transactions, []);
  for (const row of result.body.transactions) {
    assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "email", "name"]);
  }
});

test("the frontend preserves earlier high amounts but rejects future high amounts from any backend", async () => {
  const app = read("src/app.js");
  const source = app.match(/async function loadSocialTransactions\(\) \{[\s\S]*?\n\}/)[0];
  let payload = { transactions: [
    { name: "Low", amount: 54.99, createdAt: "2026-11-10T16:01:00.000Z" },
    { name: "Earlier", amount: 121, createdAt: "2026-11-10T06:03:00.000Z" },
    { name: "FutureHigh", amount: 121, createdAt: "2026-11-10T16:01:00.000Z" },
    { name: "Boundary", amount: 55, createdAt: SOCIAL_HIGH_VALUE_EXCLUSION_START },
  ] };
  const context = vm.createContext({
    socialCalendarCursor: new Date(), socialTransactions: [],
    SOCIAL_HIGH_VALUE_EXCLUSION_START_ISO: SOCIAL_HIGH_VALUE_EXCLUSION_START,
    state: { adminProfile: { role: "social_partner", socialSource: "anshu" } },
    elements: { socialCalendarPrev: {}, socialCalendarNext: {}, socialCalendarDetails: {} },
    getMonthKey: () => "2026-11", getAdminAccessToken: () => "session",
    callEdge: async () => payload, renderSocialCalendar() {},
  });
  vm.runInContext(source, context);
  for (const policy of [undefined, "verified-v2", "prospective-superadmin-only-v3"]) {
    payload = { ...payload, socialAssignmentPolicy: policy };
    await context.loadSocialTransactions();
    assert.deepEqual(Array.from(context.socialTransactions, (row) => row.name), ["Low", "Earlier"]);
  }
  for (const source of ["rohit", "alok"]) {
    context.state.adminProfile.socialSource = source;
    await context.loadSocialTransactions();
    assert.deepEqual(Array.from(context.socialTransactions, (row) => row.name), ["Low"]);
  }
});

test("the correction adds verification evidence without rewriting existing orders", () => {
  const sql = read("supabase/migrations/202611100002_require_recorded_social_verification.sql");
  assert.match(sql, /social_source_verified_at timestamptz/);
  assert.match(sql, /social_source_verified_by uuid references auth\.users\(id\)/);
  assert.match(sql, /if new\.amount >= 55 then[\s\S]*new\.social_source_manually_assigned := false;[\s\S]*new\.social_source_verified_at := null;[\s\S]*new\.social_source_verified_by := null;/);
  assert.doesNotMatch(sql, /update public\.|delete from|truncate/i);
});

test("the prospective database guard changes only high-value social assignments from the fixed cutoff", () => {
  const sql = read("supabase/migrations/202611100003_future_high_value_superadmin_only.sql");
  const updates = sql.match(/update public\.donations[\s\S]*?;/g) || [];
  assert.equal(updates.length, 1);
  assert.match(updates[0], /where amount >= 55 and created_at >= timestamptz '2026-11-10 16:00:40\+00';/);
  assert.doesNotMatch(updates[0], /\b(?:payment_route|visibility_scope|amount|created_at)\s*=/i);
  assert.doesNotMatch(sql, /delete from|truncate/i);
  assert.match(sql, /before insert or update of amount, created_at, social_source/);
  assert.match(sql, /if new\.amount >= 55 and new\.created_at >= timestamptz '2026-11-10 16:00:40\+00' then/);
});

test("the client blocks assignment of future $121 orders and leaves earlier assignment controls available", async () => {
  const source = read("src/app.js").match(/async function setOrderSocialSource\([^]*?\n\}/)[0];
  let calls = 0;
  const row = { id: "high-order", amount: 121, createdAt: SOCIAL_HIGH_VALUE_EXCLUSION_START, socialSource: null };
  const context = vm.createContext({
    SOCIAL_HIGH_VALUE_EXCLUSION_START_ISO: SOCIAL_HIGH_VALUE_EXCLUSION_START,
    state: { adminProfile: { role: "super_admin" } }, adminCalendarDonations: [row],
    elements: { adminPanel: { getAttribute: () => "false" } },
    getDonationById: () => row, getAdminAccessToken: () => "session",
    runAdminAction: async (_options, action) => action(), renderAdminCalendar() {}, setAdminStatus() {},
    callEdge: async () => { calls += 1; return { donationId: row.id, socialSource: "anshu", socialAssignmentApproved: true }; },
  });
  vm.runInContext(source, context);
  await context.setOrderSocialSource(row.id, "anshu", {});
  assert.equal(calls, 0);
  row.createdAt = "2026-11-10T06:03:00.000Z";
  await context.setOrderSocialSource(row.id, "anshu", {});
  assert.equal(calls, 1);
  assert.equal(context.adminCalendarDonations[0].socialSource, "anshu");
});

test("Admin and SuperAdmin tagging stays within each role's completed PayPal orders", async () => {
  const endpoint = read("supabase/functions/admin-donations/index.ts");
  const app = read("src/app.js");
  const update = endpoint.match(/if \(Object\.hasOwn\(body, "socialSource"\)\) \{[\s\S]*?return jsonResponse\(\{ donationId: data\.id, socialSource: data\.social_source, socialAssignmentApproved: isSocialAssignmentApproved\(data\) \}\);\s*\}/)?.[0];
  assert.ok(update);
  assert.match(update, /adminProfile\.role !== "admin" && adminProfile\.role !== "super_admin"/);
  assert.match(update, /socialSource !== "anshu" && socialSource !== "badal"/);
  assert.match(update, /social_source: socialSource,[\s\S]*social_source_manually_assigned: true/);
  assert.match(update, /\.or\(`amount.lt.55,created_at.lt.\$\{SOCIAL_HIGH_VALUE_EXCLUSION_START\}`\)/);
  for (const filter of [
    '.eq("payment_route", paymentRoute)',
    '.eq("visibility_scope", visibilityScope)',
    '.eq("payment_method", "paypal")',
    '.eq("paypal_status", "COMPLETED")',
    '.gte("created_at", SOCIAL_PORTAL_START)',
  ]) assert.ok(update.includes(filter), `Missing eligibility filter: ${filter}`);
  assert.match(update, /adminProfile\.role === "admin" \? "standard" : "superadmin"/);
  assert.match(update, /adminProfile\.role === "admin" \? "public" : "superadmin_private"/);
  assert.match(endpoint, /socialSource: donation\.social_source \|\| null/);
  assert.match(app, /allowSocialTagging: \["admin", "super_admin"\]\.includes\(state\.adminProfile\?\.role\)/);
  assert.match(app, /data-set-order-social-source="anshu"[\s\S]*data-set-order-social-source="badal"/);
  assert.match(app, /Date\.parse\(donation\.createdAt \|\| ""\) >= Date\.parse\(SOCIAL_PORTAL_START_ISO\)/);

  const rows = [
    { id: "admin-new", amount: 11, payment_route: "standard", visibility_scope: "public", payment_method: "paypal", paypal_status: "COMPLETED", created_at: "2026-11-04T00:00:00.000Z", social_source: null },
    { id: "super-new", amount: 121, payment_route: "superadmin", visibility_scope: "superadmin_private", payment_method: "paypal", paypal_status: "COMPLETED", created_at: "2026-11-10T06:03:00.000Z", social_source: null },
    { id: "admin-old", payment_route: "standard", visibility_scope: "public", payment_method: "paypal", paypal_status: "COMPLETED", created_at: "2026-11-03T18:29:59.999Z", social_source: null },
    { id: "admin-dodo", payment_route: "standard", visibility_scope: "public", payment_method: "dodo", paypal_status: "COMPLETED", created_at: "2026-11-04T00:00:00.000Z", social_source: null },
    { id: "admin-high", amount: 121, payment_route: "standard", visibility_scope: "public", payment_method: "paypal", paypal_status: "COMPLETED", created_at: SOCIAL_HIGH_VALUE_EXCLUSION_START, social_source: null },
    { id: "super-high", amount: 121, payment_route: "superadmin", visibility_scope: "superadmin_private", payment_method: "paypal", paypal_status: "COMPLETED", created_at: SOCIAL_HIGH_VALUE_EXCLUSION_START, social_source: null },
  ];
  const supabase = { from(table) {
    assert.equal(table, "donations");
    let filters = [];
    let change;
    const query = {
      update(value) { change = value; return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      gte(key, value) { filters.push((row) => row[key] >= value); return query; },
      lt(key, value) { filters.push((row) => row[key] < value); return query; },
      or() { filters.push((row) => row.amount < 55 || row.created_at < SOCIAL_HIGH_VALUE_EXCLUSION_START); return query; },
      select() { return query; },
      async maybeSingle() {
        const row = rows.find((item) => filters.every((filter) => filter(item)));
        if (row) Object.assign(row, change);
        return { data: row ? { ...row } : null, error: null };
      },
    };
    return query;
  } };
  const assign = vm.runInNewContext(`(async (body, adminProfile) => { ${update} })`, {
    supabase,
    SOCIAL_PORTAL_START: "2026-11-03T18:30:00.000Z",
    errorResponse: (message, status) => ({ error: message, status }),
    jsonResponse: (value) => ({ ...value, status: 200 }),
    isSocialAssignmentApproved, SOCIAL_HIGH_VALUE_EXCLUSION_START,
  });
  assert.equal((await assign({ donationId: "super-new", socialSource: "anshu" }, { role: "admin" })).status, 404);
  assert.equal(rows[1].social_source, null);
  assert.equal((await assign({ donationId: "admin-old", socialSource: "anshu" }, { role: "admin" })).status, 404);
  assert.equal((await assign({ donationId: "admin-dodo", socialSource: "anshu" }, { role: "admin" })).status, 404);
  assert.equal((await assign({ donationId: "admin-new", socialSource: "anshu" }, { role: "admin" })).status, 200);
  assert.equal(rows[0].social_source, "anshu");
  assert.equal((await assign({ donationId: "admin-new", socialSource: "badal" }, { role: "admin" })).status, 200);
  assert.equal(rows[0].social_source, "badal");
  assert.equal((await assign({ donationId: "admin-new", socialSource: "anshu" }, { role: "super_admin" })).status, 404);
  assert.equal((await assign({ donationId: "admin-high", socialSource: "anshu" }, { role: "admin" })).status, 404);
  assert.equal(rows[4].social_source, null);
  const approval = await assign({ donationId: "super-new", socialSource: "anshu" }, { role: "super_admin", userId: "superadmin-user" });
  assert.equal(approval.status, 200);
  assert.equal(approval.socialAssignmentApproved, true);
  assert.equal(rows[1].social_source, "anshu");
  assert.equal(rows[1].social_source_manually_assigned, true);
  assert.equal((await assign({ donationId: "super-high", socialSource: "anshu" }, { role: "super_admin", userId: "superadmin-user" })).status, 404);
  assert.equal(rows[5].social_source, null);
  assert.equal((await assign({ donationId: "admin-new", socialSource: "alok" }, { role: "admin" })).status, 200);
  assert.equal(rows[0].social_source, "alok");
  assert.equal((await assign({ donationId: "super-new", socialSource: "alok" }, { role: "super_admin" })).status, 404);
  assert.equal(rows[1].social_source, "anshu");
  assert.equal((await assign({ donationId: "super-high", socialSource: "alok" }, { role: "super_admin" })).status, 404);
  assert.equal((await assign({ donationId: "admin-new", socialSource: "rohit" }, { role: "admin" })).status, 200);
  assert.equal(rows[0].social_source, "rohit");
  assert.equal((await assign({ donationId: "super-new", socialSource: "rohit" }, { role: "super_admin" })).status, 404);
  assert.equal(rows[1].social_source, "anshu");
  assert.equal((await assign({ donationId: "super-high", socialSource: "rohit" }, { role: "super_admin" })).status, 404);
});

test("Rohit sees only his successful sub-$55 PayPal orders and no other portal records", async () => {
  const base = {
    social_source: "rohit", amount: 54.99, created_at: "2026-11-12T10:00:00.000Z",
    paypal_payer_email: "customer@example.invalid", payment_method: "paypal", paypal_status: "COMPLETED",
    payment_route: "superadmin", visibility_scope: "superadmin_private",
  };
  const rows = [
    { ...base, display_name: "RohitLow" },
    { ...base, display_name: "AdminLow", payment_route: "standard", visibility_scope: "public" },
    { ...base, display_name: "Boundary", amount: 55 },
    { ...base, display_name: "High", amount: 121, social_source_manually_assigned: true },
    { ...base, display_name: "EarlierHigh", amount: 55, created_at: "2026-11-04T10:00:00.000Z" },
    { ...base, display_name: "Anshu", social_source: "anshu" },
    { ...base, display_name: "Badal", social_source: "badal" },
    { ...base, display_name: "Untagged", social_source: null },
    { ...base, display_name: "Failed", paypal_status: "FAILED" },
  ];
  const result = await readPortalMonth(rows, "rohit");
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.transactions.map((row) => row.name), ["RohitLow", "AdminLow"]);
  for (const row of result.body.transactions) assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "email", "name"]);
  assert.equal(isSocialAssignmentApproved(rows[4]), false);
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions.map((row) => row.name), ["Anshu"]);
  assert.deepEqual((await readPortalMonth(rows, "badal")).body.transactions.map((row) => row.name), ["Badal"]);
});

test("Alok sees only his successful sub-$55 PayPal orders and no other portal records", async () => {
  const base = {
    social_source: "alok", amount: 54.99, created_at: "2026-11-12T10:00:00.000Z",
    paypal_payer_email: "customer@example.invalid", payment_method: "paypal", paypal_status: "COMPLETED",
    payment_route: "superadmin", visibility_scope: "superadmin_private",
  };
  const rows = [
    { ...base, display_name: "AlokLow" },
    { ...base, display_name: "AdminLow", payment_route: "standard", visibility_scope: "public" },
    { ...base, display_name: "Boundary", amount: 55 },
    { ...base, display_name: "High", amount: 121, social_source_manually_assigned: true },
    { ...base, display_name: "EarlierHigh", amount: 55, created_at: "2026-11-04T10:00:00.000Z" },
    { ...base, display_name: "Anshu", social_source: "anshu" },
    { ...base, display_name: "Badal", social_source: "badal" },
    { ...base, display_name: "Rohit", social_source: "rohit" },
    { ...base, display_name: "Untagged", social_source: null },
    { ...base, display_name: "Failed", paypal_status: "FAILED" },
  ];
  const result = await readPortalMonth(rows, "alok");
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.transactions.map((row) => row.name), ["AlokLow", "AdminLow"]);
  for (const row of result.body.transactions) assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "email", "name"]);
  assert.equal(isSocialAssignmentApproved(rows[4]), false);
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions.map((row) => row.name), ["Anshu"]);
  assert.deepEqual((await readPortalMonth(rows, "badal")).body.transactions.map((row) => row.name), ["Badal"]);
});

test("Rohit's migration extends source constraints without modifying order history", () => {
  const sql = read("supabase/migrations/202611120001_rohit_social_portal.sql");
  assert.match(sql, /social_source is distinct from 'rohit' or amount < 55/);
  assert.doesNotMatch(sql, /(?:update|delete from|truncate) public\./i);
  assert.doesNotMatch(sql, /insert into public\.admin_profiles/i);
});

test("Alok's migration extends source constraints without modifying order history", () => {
  const sql = read("supabase/migrations/202611130001_alok_social_portal.sql");
  assert.match(sql, /social_source is distinct from 'alok' or amount < 55/);
  assert.doesNotMatch(sql, /(?:update|delete from|truncate) public\./i);
  assert.doesNotMatch(sql, /insert into public\.admin_profiles/i);
});

test("portal authentication binds each account to its database source and rejects admins", async () => {
  const shared = read("supabase/functions/_shared/supabase.ts");
  const extract = (name) => {
    const match = shared.match(new RegExp(`export async function ${name}\\(request: Request\\) \\{[^]*?\\n\\}`));
    assert.ok(match);
    return match[0].replace("export ", "")
      .replace("request: Request", "request")
      .replaceAll(" as AdminRole", "")
      .replaceAll(" as SocialPortalSource", "")
      .replaceAll(" as const", "");
  };
  const users = {
    anshu: { id: "user-a", email: "anshu@example.invalid" },
    badal: { id: "user-b", email: "badal@example.invalid" },
    rohit: { id: "user-r", email: "rohit@example.invalid" },
    alok: { id: "user-al", email: "alok@example.invalid" },
    unified: { id: "user-u", email: "unified@example.invalid" },
    admin: { id: "user-admin", email: "admin@example.invalid" },
    standard: { id: "user-standard", email: "standard@example.invalid" },
    unknown: { id: "user-unknown", email: "unknown@example.invalid" },
  };
  const profiles = {
    admin_profiles: [
      { user_id: "user-admin", email: users.admin.email, display_name: "Admin", role: "admin" },
      { user_id: "user-standard", email: users.standard.email, display_name: "Old Portal", role: "standard" },
    ],
    unified_payment_portal_profiles: [
      { user_id: "user-u", email: users.unified.email, display_name: "Unified Payment Portal" },
    ],
    social_portal_profiles: [
      { user_id: "user-a", email: users.anshu.email, display_name: "AnshuPortal", social_source: "anshu" },
      { user_id: "user-b", email: users.badal.email, display_name: "Badal Portal", social_source: "badal" },
      { user_id: "user-r", email: users.rohit.email, display_name: "Rohit Portal", social_source: "rohit" },
      { user_id: "user-al", email: users.alok.email, display_name: "Alok Portal", social_source: "alok" },
    ],
  };
  const supabase = {
    auth: { async getUser(token) { return { data: { user: users[token] || null } }; } },
    from(table) {
      return {
        select() { return this; },
        eq(_field, userId) { this.userId = userId; return this; },
        async maybeSingle() { return { data: profiles[table].find((row) => row.user_id === this.userId) || null }; },
      };
    },
  };
  const context = vm.createContext({
    getSupabaseAdmin: () => supabase,
    jsonResponse: (body, status) => new globalThis.Response(JSON.stringify(body), { status }),
  });
  vm.runInContext(`${extract("getPortalProfile")}\n${extract("requireSocialPortal")}\n${extract("requireUnifiedPaymentPortal")}`, context);
  const request = (token) => ({ headers: new globalThis.Headers({ Authorization: `Bearer ${token}` }) });
  assert.equal((await context.requireSocialPortal(request("anshu"))).socialSource, "anshu");
  assert.equal((await context.requireSocialPortal(request("badal"))).socialSource, "badal");
  assert.equal((await context.requireSocialPortal(request("rohit"))).socialSource, "rohit");
  assert.equal((await context.requireSocialPortal(request("alok"))).socialSource, "alok");
  assert.equal((await context.requireUnifiedPaymentPortal(request("unified"))).profile.role, "unified_payment");
  assert.equal((await context.getPortalProfile(request("unified"))).profile.displayName, "Unified Payment Portal");
  await assert.rejects(context.requireSocialPortal(request("unified")), (error) => error.status === 403);
  for (const token of ["anshu", "badal", "rohit", "alok", "admin", "standard", "unknown"]) {
    await assert.rejects(context.requireUnifiedPaymentPortal(request(token)), (error) => error.status === 403);
  }
  await assert.rejects(context.requireSocialPortal(request("admin")), (error) => error.status === 403);
  await assert.rejects(context.getPortalProfile(request("standard")), (error) => error.status === 403);
  await assert.rejects(context.requireSocialPortal(request("unknown")), (error) => error.status === 403);
});

test("retired Standard Portal cannot sign in or read orders; Admin payment history stays intact", () => {
  const migration = read("supabase/migrations/202611040002_retire_standard_portal.sql");
  const app = read("src/app.js");
  const html = read("index.html");
  const settings = read("supabase/functions/admin-settings/index.ts");
  const config = read("supabase/config.toml");
  const packageConfig = JSON.parse(read("package.json"));

  assert.match(migration, /delete from public\.admin_profiles where role = 'standard'/);
  assert.match(migration, /check \(role in \('admin', 'super_admin'\)\)/);
  assert.doesNotMatch(migration, /(?:delete|update) (?:from )?public\.(?:donations|digital_orders|payment_attempts|memberships)/i);
  assert.doesNotMatch(app, /standard-transactions|superAdminStandardPreviewEnabled|role === "standard"/);
  assert.match(app, /\["social_partner", "unified_payment"\]\.includes\(state\.adminProfile\?\.role\)\) \{\s*openSocialPanel\(\);\s*await loadSocialTransactions\(\)/);
  assert.doesNotMatch(html, /Standard Portal|superAdminStandardPreviewEnabled/);
  assert.doesNotMatch(settings, /superAdminStandardPreviewEnabled/);
  assert.doesNotMatch(config, /functions\.standard-transactions/);
  assert.doesNotMatch(packageConfig.scripts["supabase:deploy"], /standard-transactions/);
  assert.equal(existsSync(path.join(root, "supabase/functions/standard-transactions/index.ts")), false);
  assert.match(app, /homepagePayPalRoute: "standard"/);
  assert.match(read("supabase/functions/social-portal-transactions/index.ts"), /\.in\("payment_route", \["standard", "superadmin"\]\)/);
});

test("social accounts cannot inherit admin privileges and attribution leaves old orders unchanged", () => {
  const migration = read("supabase/migrations/202611040001_social_source_portals.sql");
  const profile = read("supabase/functions/_shared/supabase.ts");
  const capture = read("supabase/functions/capture-paypal-order/index.ts");
  const create = read("supabase/functions/create-paypal-order/index.ts");
  const prepare = read("supabase/functions/prepare-paypal-subscription/index.ts");
  const app = read("src/app.js");

  assert.match(migration, /create table if not exists public\.social_portal_profiles/);
  assert.match(migration, /alter table public\.social_portal_profiles enable row level security/);
  assert.match(migration, /revoke all on public\.social_portal_profiles from anon, authenticated/);
  assert.match(migration, /new\.membership_id is not null[\s\S]*select social_source into new\.social_source/);
  assert.doesNotMatch(migration, /update public\.(?:donations|payment_attempts|memberships)|delete from public\.(?:donations|payment_attempts|memberships)/i);
  assert.match(profile, /\.from\("social_portal_profiles"\)[\s\S]*\.eq\("user_id", data\.user\.id\)/);
  assert.match(create, /social_source: getAutomaticSocialSource\(body\.sourceTag, amountCents\)/);
  assert.match(prepare, /social_source: getAutomaticSocialSource\(body\.sourceTag, amountCents\)/);
  assert.match(capture, /social_source: paymentAttempt\.social_source \|\| null/);
  assert.match(app, /function renderSocialCalendar\(\)[\s\S]*email\.textContent = transaction\.email/);
});


test("Unified Payment Portal equals the eligible union of all four partners and excludes SuperAdmin-only records", async () => {
  const base = {
    amount: 11, created_at: "2026-11-14T10:00:00.000Z",
    paypal_payer_email: "customer@example.invalid", digital_orders: { contact_email: "order@example.invalid" },
    payment_method: "paypal", paypal_status: "COMPLETED", payment_route: "superadmin", visibility_scope: "superadmin_private",
  };
  const rows = [
    ...["anshu", "badal", "rohit", "alok"].flatMap((social_source) => [
      { ...base, social_source, display_name: `${social_source}-low` },
      { ...base, social_source, display_name: `${social_source}-standard`, payment_route: "standard", visibility_scope: "public", amount: 54.99 },
      { ...base, social_source, display_name: `${social_source}-earlier-high`, amount: 55, created_at: "2026-11-04T10:00:00.000Z" },
      { ...base, social_source, display_name: `${social_source}-boundary`, amount: 55, social_source_manually_assigned: true },
      { ...base, social_source, display_name: `${social_source}-failed`, paypal_status: "FAILED" },
      { ...base, social_source, display_name: `${social_source}-old`, created_at: "2026-11-03T18:29:59.999Z" },
    ]),
    { ...base, display_name: "Untagged", social_source: null },
    { ...base, display_name: "Other", social_source: "unknown" },
    { ...base, display_name: "Dodo", social_source: "anshu", payment_method: "dodo" },
    { ...base, display_name: "Pending", social_source: "badal", paypal_status: "APPROVED" },
  ];
  const expected = (await Promise.all(["anshu", "badal", "rohit", "alok"].map((source) => readPortalMonth(rows, source))))
    .flatMap((result) => result.body.transactions.map((row) => row.name)).sort();
  const result = await readPortalMonth(rows, "unified");
  assert.equal(result.status, 200);
  assert.equal(expected.length, 10);
  assert.deepEqual(result.body.transactions.map((row) => row.name).sort(), expected);
  for (const row of result.body.transactions) {
    assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "email", "name", "socialSource"]);
    assert.equal(row.email, "order@example.invalid");
  }
  assert.deepEqual((await readPortalMonth(rows, "unified", "2026-10")).body.transactions, []);
  assert.equal((await readPortalMonth(rows, "unified", "2026-99")).status, 422);
  const many = Array.from({ length: 1001 }, (_, index) => ({ ...base, display_name: `Order${index}`, social_source: "anshu" }));
  assert.equal((await readPortalMonth(many, "unified")).body.transactions.length, 1001);
});

test("Unified portal migration adds a protected read-only identity without changing any orders or existing profiles", () => {
  const sql = read("supabase/migrations/202611140001_unified_payment_portal.sql");
  assert.match(sql, /alter table public\.unified_payment_portal_profiles enable row level security/);
  assert.match(sql, /revoke all on public\.unified_payment_portal_profiles from anon, authenticated/);
  assert.doesNotMatch(sql, /(?:update|delete from|truncate|alter table) public\.(?:donations|digital_orders|payment_attempts|memberships|admin_profiles|social_portal_profiles)/i);
  assert.doesNotMatch(sql, /password/i);
});
