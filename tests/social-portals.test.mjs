import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import vm from "node:vm";
import { policy, getSocialLimitCents } from "./helpers/social-policy.mjs";
import { createQuery } from "./helpers/portal-query.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const socialRules = read("supabase/functions/_shared/social-source.ts")
  .replace(/^export type .*;\n/gm, "").replaceAll("export ", "")
  .replaceAll("value: unknown", "value").replaceAll("amountCents: number", "amountCents")
  .replaceAll("donation: any", "donation").replaceAll(": SocialSource | null", "");
const { isSocialAssignmentApproved, SOCIAL_PORTAL_START } = vm.runInNewContext(
  `${socialRules}; ({ isSocialAssignmentApproved, SOCIAL_PORTAL_START })`,
);

test("only the current tagged path attributes PayPal checkout", () => {
  const app = read("src/app.js");
  const source = app.match(/function readSocialSourceTag\(\)[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const window = {
    location: { pathname: "/sowseed", search: "" },
  };
  const context = vm.createContext({ ...policy, getSocialLimitCents: (date) => getSocialLimitCents(date || "2026-11-17T00:00:00Z"), window });
  vm.runInContext(source, context);
  assert.equal(context.readSocialSourceTag(), "anshu");
  window.location.pathname = "/seed";
  assert.equal(context.readSocialSourceTag(), "badal");
  window.location.pathname = "/garden";
  assert.equal(context.readSocialSourceTag(), "rohit");
  window.location.pathname = "/garden/";
  assert.equal(context.readSocialSourceTag(), "rohit");
  window.location.pathname = "/seedhere";
  assert.equal(context.readSocialSourceTag(), "himanshu");
  window.location.pathname = "/seedhere/";
  assert.equal(context.readSocialSourceTag(), "himanshu");
  window.location.pathname = "/sownow";
  assert.equal(context.readSocialSourceTag(), "alok");
  window.location.pathname = "/sownow/";
  assert.equal(context.readSocialSourceTag(), "alok");
  window.location.pathname = "/seeds";
  assert.equal(context.readSocialSourceTag(), "ayush");
  window.location.pathname = "/seeds/";
  assert.equal(context.readSocialSourceTag(), "ayush");
  window.location.pathname = "/";
  assert.equal(context.readSocialSourceTag(), null);
  window.location.search = "?campaign=unknown";
  assert.equal(context.readSocialSourceTag(), null);
  assert.equal((app.match(/sourceTag: readSocialSourceTag\(\)/g) || []).length, 4);
  assert.match(app, /sourceTag: details\.sourceTag, productType: "seed"/);
  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  const routing = JSON.parse(read("vercel.json"));
  assert.deepEqual(routing.rewrites.map(({ source, destination }) => [source, destination]), [
    ["/sowseed", "/index.html"], ["/seed", "/index.html"], ["/garden", "/index.html"], ["/sownow", "/index.html"], ["/seeds", "/index.html"], ["/seedhere", "/index.html"],
  ]);
  assert.deepEqual(routing.redirects.map(({ source, destination }) => [source, destination]), [
    ["/sowseed/", "/sowseed"], ["/seed/", "/seed"], ["/garden/", "/garden"], ["/sownow/", "/sownow"], ["/seeds/", "/seeds"], ["/seedhere/", "/seedhere"],
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
      return createQuery(rows);
    },
  };
  vm.runInNewContext(source, {
    Deno: { serve(callback) { handler = callback; } },
    withCors: (callback) => callback,
    handleOptions: () => null,
    requireSocialPortal: async (request) => {
      const bearer = request.headers.get("Authorization");
      if (!["Bearer anshu", "Bearer badal", "Bearer rohit", "Bearer alok", "Bearer ayush", "Bearer himanshu"].includes(bearer)) {
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
    ...policy, isSocialAssignmentApproved, SOCIAL_PORTAL_START,
  });
  const request = new globalThis.Request(`https://local.invalid/social-portal-transactions?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const response = await handler(request);
  return { status: response.status, body: response.status === 200 ? await response.json() : null };
}

test("each partner retains only its own eligible history and rejects new $33 orders", async () => {
  const base = { amount: 11, created_at: "2026-11-16T18:30:00.000Z",
    paypal_payer_email: "payer@example.invalid", digital_orders: { contact_email: "order@example.invalid" },
    payment_method: "paypal", paypal_status: "COMPLETED", payment_route: "superadmin", visibility_scope: "superadmin_private" };
  const rows = ["anshu", "badal", "rohit", "alok", "ayush", "himanshu"].flatMap((social_source) => [
    { ...base, social_source, display_name: `${social_source}-first` },
    { ...base, social_source, display_name: `${social_source}-last-cent`, amount: 32.99 },
    { ...base, social_source, display_name: `${social_source}-existing`, amount: 44, created_at: "2026-11-12T00:00:00.000Z" },
    { ...base, social_source, display_name: `${social_source}-nov16`, amount: 54.99, created_at: "2026-11-16T18:29:59.999Z" },
    { ...base, social_source, display_name: "Before", created_at: "2026-11-03T18:29:59.999Z" },
    ...[33, 33.01, 54.99, 55, 121].map((amount) => ({ ...base, social_source, amount, display_name: "Private", social_source_manually_assigned: true })),
    { ...base, social_source, display_name: "Failed", paypal_status: "FAILED" },
    { ...base, social_source, display_name: "Dodo", payment_method: "dodo" },
  ]);
  const original = JSON.stringify(rows);
  for (const source of ["anshu", "badal", "rohit", "alok", "ayush", "himanshu"]) {
    const result = await readPortalMonth(rows, source);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.transactions.map((row) => row.name), [`${source}-first`, `${source}-existing`]);
    for (const row of result.body.transactions) assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "email", "name"]);
    assert.deepEqual((await readPortalMonth(rows, source, "2026-10")).body.transactions, []);
  }
  assert.equal((await readPortalMonth(rows, "unknown")).status, 403);
  assert.equal(JSON.stringify(rows), original);
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

test("old high-value exceptions no longer grant any partner visibility", () => {
  for (const social_source of ["anshu", "badal", "rohit", "alok", "ayush", "himanshu"]) {
    for (const amount of [55, 121]) {
      assert.equal(isSocialAssignmentApproved({ social_source, amount, created_at: "2026-11-04T00:00:00Z", social_source_manually_assigned: true }), false);
      assert.equal(isSocialAssignmentApproved({ social_source, amount, created_at: "2026-11-16T18:30:00.000Z", social_source_manually_assigned: true }), false);
    }
  }
});

test("frontend rejects stale high values and earlier rows from any backend policy", async () => {
  const source = read("src/app.js").match(/async function loadSocialTransactions\(\) \{[\s\S]*?\n\}/)[0];
  const payload = { transactions: [
    { name: "Low", amount: 22, createdAt: SOCIAL_PORTAL_START },
    { name: "Early", amount: 11, createdAt: "2026-11-03T18:29:59.999Z" },
    { name: "Boundary", amount: 33, createdAt: "2026-11-16T18:30:00.000Z" },
    { name: "LegacyHigh", amount: 121, createdAt: "2026-11-04T00:00:00Z" },
  ] };
  const context = vm.createContext({ ...policy, getSocialLimitCents: (date) => getSocialLimitCents(date || "2026-11-17T00:00:00Z"), socialCalendarCursor: new Date(), socialTransactions: [],
    SOCIAL_PARTNER_HISTORY_START_ISO: policy.SOCIAL_PARTNER_HISTORY_START,
    SOCIAL_PORTAL_START_ISO: SOCIAL_PORTAL_START,
    state: { adminProfile: { role: "social_partner", socialSource: "anshu" } },
    elements: { socialCalendarPrev: {}, socialCalendarNext: {}, socialCalendarDetails: {} },
    getMonthKey: () => "2026-11", getAdminSessionKey: () => "session", callEdge: async () => payload, renderSocialCalendar() {},
  });
  vm.runInContext(source, context);
  for (const source of ["anshu", "badal", "rohit", "alok", "ayush", "himanshu"]) {
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

test("client blocks $33 and earlier orders before calling the assignment API", async () => {
  const source = read("src/app.js").match(/async function setOrderSocialSource\([^]*?\n\}/)[0];
  let calls = 0;
  const row = { id: "order", amount: 33, createdAt: "2026-11-16T18:30:00.000Z", socialSource: null };
  const context = vm.createContext({ ...policy, getSocialLimitCents: (date) => getSocialLimitCents(date || "2026-11-17T00:00:00Z"), SOCIAL_PORTAL_START_ISO: SOCIAL_PORTAL_START,
    state: { adminProfile: { role: "admin" } }, adminCalendarDonations: [row],
    elements: { adminPanel: { getAttribute: () => "false" } }, getDonationById: () => row, getAdminSessionKey: () => "session",
    runAdminAction: async (_options, action) => action(), renderAdminCalendar() {}, setAdminStatus() {},
    callEdge: async () => { calls++; return { donationId: row.id, socialSource: "anshu", socialAssignmentApproved: true }; },
  });
  vm.runInContext(source, context);
  await context.setOrderSocialSource(row.id, "anshu", {});
  assert.equal(calls, 0);
  row.amount = 22; row.createdAt = "2026-11-15T18:29:59.999Z";
  await context.setOrderSocialSource(row.id, "anshu", {});
  assert.equal(calls, 0);
  row.createdAt = SOCIAL_PORTAL_START;
  await context.setOrderSocialSource(row.id, "anshu", {});
  assert.equal(calls, 1);
});

function createAssignmentApi(rows) {
  const endpoint = read("supabase/functions/admin-donations/index.ts");
  const scope = endpoint.match(/function applyAdminDonationScope\([^]*?\n\}/)[0]
    .replace('query: any, role: "admin" | "super_admin"', 'query, role');
  const update = endpoint.match(/if \(Object\.hasOwn\(body, "socialSource"\)\) \{[\s\S]*?return jsonResponse\(\{ donationId: data\.id, socialSource: data\.social_source, socialAssignmentApproved: isSocialAssignmentApproved\(data\) \}\);\s*\}/)[0];
  const supabase = { from: () => createQuery(rows) };
  const context = { ...policy, getSocialLimitCents: (date) => getSocialLimitCents(date || "2026-11-17T00:00:00Z"), supabase, SOCIAL_PORTAL_START, isSocialAssignmentApproved,
    errorResponse: (error, status) => ({ error, status }), jsonResponse: (body) => ({ ...body, status: 200 }) };
  return vm.runInNewContext(`${scope}; (async (body, adminProfile) => { ${update} })`, context);
}

test("Admin switches all eligible orders among six partners without changing their payment data", async () => {
  const base = { amount: 11, created_at: "2026-11-16T18:30:00.000Z", payment_method: "paypal", paypal_status: "COMPLETED", social_source: "anshu" };
  const rows = [
    { ...base, id: "admin", payment_route: "standard", visibility_scope: "public" },
    { ...base, id: "private-low", payment_route: "superadmin", visibility_scope: "superadmin_private" },
    { ...base, id: "private-high", amount: 33, payment_route: "superadmin", visibility_scope: "superadmin_private" },
    { ...base, id: "standard-high", amount: 55, payment_route: "standard", visibility_scope: "public" },
    { ...base, id: "early", created_at: "2026-11-15T18:29:59.999Z", payment_route: "standard", visibility_scope: "public" },
    { ...base, id: "failed", paypal_status: "FAILED", payment_route: "standard", visibility_scope: "public" },
  ];
  const assign = createAssignmentApi(rows);
  for (const row of rows.slice(0, 2)) {
    const immutable = { ...row }; delete immutable.social_source;
    for (const socialSource of ["alok", "badal", "rohit", "anshu", "ayush", "himanshu"]) {
      const response = await assign({ donationId: row.id, socialSource }, { role: "admin" });
      assert.equal(response.status, 200);
      assert.equal(response.socialAssignmentApproved, true);
      assert.equal(row.social_source, socialSource);
      const stored = { ...row }; delete stored.social_source; delete stored.social_source_manually_assigned;
      assert.deepEqual(stored, immutable);
    }
  }
  for (const row of rows.slice(2)) {
    const original = JSON.stringify(row);
    for (const socialSource of [null, "anshu", "badal", "rohit", "alok"]) {
      assert.equal((await assign({ donationId: row.id, socialSource }, { role: "admin" })).status, 404);
    }
    assert.equal(JSON.stringify(row), original);
  }
  assert.equal((await assign({ donationId: "admin", socialSource: "alok" }, { role: "social_partner" })).status, 403);
});

test("Rohit sees only his successful sub-$33 PayPal orders and no other portal records", async () => {
  const base = {
    social_source: "rohit", amount: 22, created_at: "2026-11-17T10:00:00.000Z",
    paypal_payer_email: "customer@example.invalid", payment_method: "paypal", paypal_status: "COMPLETED",
    payment_route: "superadmin", visibility_scope: "superadmin_private",
  };
  const rows = [
    { ...base, display_name: "RohitLow" },
    { ...base, display_name: "AdminLow", payment_route: "standard", visibility_scope: "public" },
    { ...base, display_name: "Boundary", amount: 33 },
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

test("Alok sees only his successful sub-$33 PayPal orders and no other portal records", async () => {
  const base = {
    social_source: "alok", amount: 22, created_at: "2026-11-17T10:00:00.000Z",
    paypal_payer_email: "customer@example.invalid", payment_method: "paypal", paypal_status: "COMPLETED",
    payment_route: "superadmin", visibility_scope: "superadmin_private",
  };
  const rows = [
    { ...base, display_name: "AlokLow" },
    { ...base, display_name: "AdminLow", payment_route: "standard", visibility_scope: "public" },
    { ...base, display_name: "Boundary", amount: 33 },
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
    ayush: { id: "user-ay", email: "ayush@example.invalid" },
    himanshu: { id: "user-h", email: "himanshu@example.invalid" },
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
      { user_id: "user-ay", email: users.ayush.email, display_name: "Ayush Portal", social_source: "ayush" },
      { user_id: "user-h", email: users.himanshu.email, display_name: "Himanshu Portal", social_source: "himanshu" },
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
  const context = vm.createContext({ ...policy, getSocialLimitCents: (date) => getSocialLimitCents(date || "2026-11-17T00:00:00Z"),
    getSupabaseAdmin: () => supabase,
    jsonResponse: (body, status) => new globalThis.Response(JSON.stringify(body), { status }),
  });
  vm.runInContext(`${extract("getPortalProfile")}\n${extract("requireSocialPortal")}\n${extract("requireUnifiedPaymentPortal")}`, context);
  const request = (token) => ({ headers: new globalThis.Headers({ Authorization: `Bearer ${token}` }) });
  assert.equal((await context.requireSocialPortal(request("anshu"))).socialSource, "anshu");
  assert.equal((await context.requireSocialPortal(request("badal"))).socialSource, "badal");
  assert.equal((await context.requireSocialPortal(request("rohit"))).socialSource, "rohit");
  assert.equal((await context.requireSocialPortal(request("alok"))).socialSource, "alok");
  assert.equal((await context.requireSocialPortal(request("ayush"))).socialSource, "ayush");
  assert.equal((await context.requireSocialPortal(request("himanshu"))).socialSource, "himanshu");
  assert.equal((await context.requireUnifiedPaymentPortal(request("unified"))).profile.role, "unified_payment");
  assert.equal((await context.getPortalProfile(request("unified"))).profile.displayName, "Unified Payment Portal");
  await assert.rejects(context.requireSocialPortal(request("unified")), (error) => error.status === 403);
  for (const token of ["anshu", "badal", "rohit", "alok", "ayush", "himanshu", "admin", "standard", "unknown"]) {
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
    amount: 11, created_at: "2026-11-17T10:00:00.000Z",
    paypal_payer_email: "customer@example.invalid", digital_orders: { contact_email: "order@example.invalid" },
    payment_method: "paypal", paypal_status: "COMPLETED", payment_route: "superadmin", visibility_scope: "superadmin_private",
  };
  const rows = [
    ...["anshu", "badal", "rohit", "alok"].flatMap((social_source) => [
      { ...base, social_source, display_name: `${social_source}-low` },
      { ...base, social_source, display_name: `${social_source}-standard`, payment_route: "standard", visibility_scope: "public", amount: 22 },
      { ...base, social_source, display_name: `${social_source}-earlier-high`, amount: 55, created_at: "2026-11-04T10:00:00.000Z" },
      { ...base, social_source, display_name: `${social_source}-boundary`, amount: 33, social_source_manually_assigned: true },
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
  assert.equal(expected.length, 8);
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

test("cached Hide requests assign only the selected payment to Ayush and can be reassigned", async () => {
  const target = { id: "hide-me", display_name: "Hidden payment", amount: 22, created_at: SOCIAL_PORTAL_START,
    payment_method: "paypal", paypal_status: "COMPLETED", payment_route: "superadmin", visibility_scope: "superadmin_private",
    social_source: "anshu", social_source_manually_assigned: true,
    paypal_order_id: "ORIGINAL-ORDER", paypal_capture_id: "ORIGINAL-CAPTURE", membership_id: "original-membership" };
  const other = { ...target, id: "keep-me", display_name: "Other payment", social_source: "badal" };
  const rows = [target, other];
  const originalOther = JSON.stringify(other);
  const originalPayment = { ...target }; delete originalPayment.social_source;
  const assign = createAssignmentApi(rows);
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions.map((row) => row.name), ["Hidden payment"]);
  const hidden = await assign({ donationId: target.id, socialSource: null }, { role: "admin" });
  assert.equal(hidden.status, 200);
  assert.equal(hidden.socialSource, "ayush");
  assert.equal(hidden.socialAssignmentApproved, true);
  assert.deepEqual((await readPortalMonth(rows, "ayush")).body.transactions.map((row) => row.name), ["Hidden payment"]);
  for (const source of ["anshu", "badal", "rohit", "alok", "unified"]) {
    assert.ok((await readPortalMonth(rows, source)).body.transactions.every((row) => row.name !== "Hidden payment"));
  }
  const remaining = { ...target }; delete remaining.social_source;
  assert.deepEqual(remaining, originalPayment);
  assert.equal(JSON.stringify(other), originalOther);
  assert.equal(rows.length, 2);
  assert.equal((await assign({ donationId: target.id, socialSource: null }, { role: "social_partner" })).status, 403);
  assert.equal((await assign({ donationId: target.id, socialSource: "unknown" }, { role: "admin" })).status, 422);
  const restored = await assign({ donationId: target.id, socialSource: "alok" }, { role: "admin" });
  assert.equal(restored.status, 200);
  assert.equal(restored.socialAssignmentApproved, true);
  assert.deepEqual((await readPortalMonth(rows, "alok")).body.transactions.map((row) => row.name), ["Hidden payment"]);
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions, []);
});

test("Ayush button sends an explicit assignment and keeps the payment in Admin's calendar", async () => {
  const app = read("src/app.js");
  const setSource = app.match(/async function setOrderSocialSource\([^]*?\n\}/)[0];
  const click = app.match(/function handleAdminCalendarDetailClick\([^]*?\n\}/)[0];
  const row = { id: "payment", amount: 22, createdAt: SOCIAL_PORTAL_START, socialSource: "anshu" };
  const requests = [];
  let clickAction;
  const context = vm.createContext({ ...policy, getSocialLimitCents: (date) => getSocialLimitCents(date || "2026-11-17T00:00:00Z"), SOCIAL_PORTAL_START_ISO: SOCIAL_PORTAL_START,
    state: { adminProfile: { role: "admin" } }, adminCalendarDonations: [row],
    elements: { adminPanel: { getAttribute: () => "false" } },
    getDonationById: () => row, getAdminSessionKey: () => "session", renderAdminCalendar() {}, setAdminStatus() {},
    runAdminAction: (_options, action) => (clickAction = action()),
    callEdge: async (_endpoint, options) => { requests.push(options.body); return { donationId: row.id, socialSource: "ayush", socialAssignmentApproved: true }; },
  });
  vm.runInContext(`${setSource}\n${click}`, context);
  const button = { dataset: { donationId: row.id, setOrderSocialSource: "ayush" } };
  context.handleAdminCalendarDetailClick({ target: { closest: (selector) => selector === "[data-set-order-social-source]" ? button : null } });
  await clickAction;
  assert.equal(requests.length, 1);
  assert.equal(requests[0].socialSource, "ayush");
  assert.equal(context.adminCalendarDonations.length, 1);
  assert.equal(context.adminCalendarDonations[0].socialSource, "ayush");
  assert.equal(context.adminCalendarDonations[0].socialAssignmentApproved, true);
});

test("November 16 uses 55 permanently while November 17 uses 33 across visibility and existing partner assignment", async () => {
  const before = "2026-11-16T18:29:59.999Z";
  const after = "2026-11-16T18:30:00.000Z";
  const base = { payment_method: "paypal", paypal_status: "COMPLETED", payment_route: "superadmin", visibility_scope: "superadmin_private", social_source: "anshu" };
  const rows = [
    { ...base, id: "today33", display_name: "Today33", amount: 33, created_at: before },
    { ...base, id: "today44", display_name: "Today44", amount: 44, created_at: before },
    { ...base, id: "today55", display_name: "Today55", amount: 55, created_at: before },
    { ...base, id: "tomorrow22", display_name: "Tomorrow22", amount: 22, created_at: after },
    { ...base, id: "tomorrow33", display_name: "Tomorrow33", amount: 33, created_at: after },
  ];
  const assign = createAssignmentApi(rows);
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions.map((row) => row.name), ["Today33", "Today44", "Tomorrow22"]);
  for (const row of [rows[0], rows[1], rows[3]]) {
    assert.equal((await assign({ donationId: row.id, socialSource: null }, { role: "admin" })).status, 200);
    for (const source of ["anshu", "badal", "rohit", "alok", "ayush", "himanshu"]) {
      assert.equal((await assign({ donationId: row.id, socialSource: source }, { role: "admin" })).status, 200);
      assert.ok((await readPortalMonth(rows, source)).body.transactions.some((item) => item.name === row.display_name));
    }
  }
  for (const row of [rows[2], rows[4]]) {
    for (const source of [null, "anshu", "badal", "rohit", "alok"]) {
      assert.equal((await assign({ donationId: row.id, socialSource: source }, { role: "admin" })).status, 404);
    }
  }
});


test("Ayush uses original India dates at both amount boundaries and never sees other partners", async () => {
  const base = { social_source: "ayush", amount: 22, created_at: "2026-11-16T18:30:00.000Z",
    payment_method: "paypal", paypal_status: "COMPLETED", payment_route: "superadmin", visibility_scope: "superadmin_private",
    paypal_payer_email: "payer@example.invalid" };
  const rows = [
    { ...base, display_name: "Eligible multiple" },
    { ...base, display_name: "Old eligible", amount: 44, created_at: "2026-11-16T18:29:59.999Z" },
    { ...base, display_name: "Old boundary", amount: 55, created_at: "2026-11-16T18:29:59.999Z" },
    { ...base, display_name: "New boundary", amount: 33 },
    { ...base, display_name: "Not paid", paypal_status: "FAILED" },
    { ...base, display_name: "Ordinary untagged", social_source: null },
    { ...base, display_name: "Another partner", social_source: "alok" },
  ];
  const original = JSON.stringify(rows);
  const result = await readPortalMonth(rows, "ayush");
  assert.deepEqual(result.body.transactions.map((row) => row.name), ["Eligible multiple", "Old eligible"]);
  for (const row of result.body.transactions) assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "email", "name"]);
  assert.equal(JSON.stringify(rows), original);
  for (const source of ["anshu", "badal", "rohit", "alok"]) {
    assert.ok((await readPortalMonth(rows, source)).body.transactions.every((row) => !["Eligible multiple", "Old eligible"].includes(row.name)));
  }
});

test("Ayush backfill is limited to explicitly hidden eligible completed payments", () => {
  const sql = read("supabase/migrations/202611170001_ayush_social_portal.sql");
  const updates = sql.match(/update public\.[^;]+;/gi);
  assert.equal(updates.length, 1);
  assert.match(updates[0], /set social_source = 'ayush'/);
  assert.match(updates[0], /social_source is null/);
  assert.match(updates[0], /social_source_manually_assigned = true/);
  assert.match(updates[0], /paypal_status = 'COMPLETED'/);
  assert.match(updates[0], /created_at >= timestamptz '2026-11-15 18:30:00\+00'/);
  assert.match(updates[0], /case when created_at < timestamptz '2026-11-16 18:30:00\+00' then 55 else 33 end/);
  assert.doesNotMatch(updates[0], /set[\s\S]*\b(?:amount|created_at|payment_route|visibility_scope|paypal_order_id|paypal_capture_id|membership_id)\s*=/);
  assert.doesNotMatch(sql, /delete from|truncate|drop table/i);
  assert.match(sql, /donations_ayush_amount_check/);
  assert.match(sql, /add column login_username text unique/);
});


test("Admin sees only specifically authorized restored Ayush history without exposing other private history", async () => {
  const endpoint = read("supabase/functions/admin-donations/index.ts");
  const scope = endpoint.match(/function applyAdminDonationScope\([^]*?\n\}/)[0]
    .replace('query: any, role: "admin" | "super_admin"', 'query, role');
  const apply = vm.runInNewContext(`${scope}; applyAdminDonationScope`, policy);
  const base = { payment_method: "paypal", amount: 33, created_at: "2026-11-15T04:17:00.000Z",
    payment_route: "superadmin", visibility_scope: "superadmin_private", social_source: "ayush",
    raw_payment: { recovery: { adminHistoryVisible: true } } };
  const rows = [
    { ...base, id: "authorized-restored" },
    { ...base, id: "ordinary-private", raw_payment: {} },
    { ...base, id: "other-partner", social_source: "rohit" },
    { ...base, id: "unassigned", social_source: null },
    { ...base, id: "old-limit", amount: 55 },
    { ...base, id: "new-limit", created_at: "2026-11-16T18:30:00.000Z" },
  ];
  const original = JSON.stringify(rows);
  const { data } = await apply(createQuery(rows), "admin").range(0, 499);
  assert.deepEqual(data.map((row) => row.id), ["authorized-restored"]);
  assert.equal(JSON.stringify(rows), original);
});

test("non-multiple payments cannot be assigned to any partner and keep their original data", async () => {
  const rows = [7, 12, 14.99, 19.99, 32.99].map((amount) => ({ id: `order-${amount}`, amount, created_at: "2026-11-18T00:00:00Z", payment_method: "paypal", paypal_status: "COMPLETED", payment_route: "standard", visibility_scope: "public", social_source: null, paypal_order_id: `provider-${amount}` }));
  const snapshot = JSON.stringify(rows);
  const assign = createAssignmentApi(rows);
  for (const row of rows) for (const socialSource of ["anshu", "badal", "rohit", "alok", "ayush", "himanshu", null]) {
    assert.equal((await assign({ donationId: row.id, socialSource }, { role: "admin" })).status, 404);
  }
  assert.equal(JSON.stringify(rows), snapshot);
});

test("Himanshu sees only eligible own-source orders while Rohit's history stays intact", async () => {
  const base = { amount: 11, created_at: "2026-11-19T00:00:00.000Z", payment_method: "paypal", paypal_status: "COMPLETED", payment_route: "superadmin", visibility_scope: "superadmin_private", paypal_payer_email: "payer@example.invalid" };
  const rows = [
    { ...base, social_source: "rohit", display_name: "Retained Rohit order", created_at: "2026-11-12T00:00:00.000Z" },
    { ...base, social_source: "himanshu", display_name: "Himanshu own order", amount: 22 },
    { ...base, social_source: "himanshu", display_name: "Non-multiple", amount: 14.99 },
    { ...base, social_source: "himanshu", display_name: "Exclusive boundary", amount: 33 },
    { ...base, social_source: "himanshu", display_name: "Not completed", paypal_status: "FAILED" },
    { ...base, social_source: "alok", display_name: "Alok own order" },
  ];
  const original = JSON.stringify(rows);
  assert.deepEqual((await readPortalMonth(rows, "himanshu")).body.transactions.map((row) => row.name), ["Himanshu own order"]);
  assert.deepEqual((await readPortalMonth(rows, "rohit")).body.transactions.map((row) => row.name), ["Retained Rohit order"]);
  assert.deepEqual((await readPortalMonth(rows, "alok")).body.transactions.map((row) => row.name), ["Alok own order"]);
  assert.equal(JSON.stringify(rows), original);
});

test("Himanshu's schema extension leaves orders, checkout attempts, memberships and other accounts untouched", () => {
  const sql = read("supabase/migrations/202611190001_himanshu_social_portal.sql");
  for (const table of ["payment_attempts", "memberships", "donations", "social_portal_profiles"]) assert.ok(sql.includes(`alter table public.${table}`));
  assert.equal((sql.match(/'anshu', 'badal', 'rohit', 'alok', 'ayush', 'himanshu'/g) || []).length, 4);
  assert.match(sql, /mod\(amount, 11\) = 0/);
  assert.match(sql, /2026-11-16 18:30:00\+00/);
  assert.match(sql, /then 55 else 33 end/);
  assert.doesNotMatch(sql, /\bupdate\s+public\.|\binsert\s+into|\bdelete\s+from|\btruncate|drop table/i);
});
