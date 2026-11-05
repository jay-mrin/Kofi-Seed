import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

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
  window.location.pathname = "/";
  assert.equal(context.readSocialSourceTag(), null);
  window.location.search = "?campaign=unknown";
  assert.equal(context.readSocialSourceTag(), null);
  assert.equal((app.match(/sourceTag: readSocialSourceTag\(\)/g) || []).length, 3);
  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  const routing = JSON.parse(read("vercel.json"));
  assert.deepEqual(routing.rewrites.map(({ source, destination }) => [source, destination]), [
    ["/sowseed", "/index.html"], ["/seed", "/index.html"],
  ]);
  assert.deepEqual(routing.redirects.map(({ source, destination }) => [source, destination]), [
    ["/sowseed/", "/sowseed"], ["/seed/", "/seed"],
  ]);
  assert.equal(new URL("src/app.js", "https://example.invalid/sowseed").pathname, "/src/app.js");
});

async function readPortalMonth(rows, token, month = "2026-11") {
  const source = read("supabase/functions/social-portal-transactions/index.ts")
    .replace(/^import .*;\n/gm, "")
    .replace(
      "const transactions: Array<{ name: string; amount: number; email: string; createdAt: string }> = [];",
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
      if (bearer !== "Bearer anshu" && bearer !== "Bearer badal") {
        throw new globalThis.Response("Forbidden", { status: 403 });
      }
      return { supabase, socialSource: bearer.slice(7) };
    },
    jsonResponse: (body) => new globalThis.Response(JSON.stringify(body)),
    errorResponse: (message, status) => new globalThis.Response(message, { status }),
    URL, Response: globalThis.Response,
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
    order("Failed", "anshu", "2026-11-04T14:00:00.000Z", { paypal_status: "FAILED" }),
    order("Dodo", "anshu", "2026-11-04T15:00:00.000Z", { payment_method: "dodo" }),
    order("Untagged", null, "2026-11-04T16:00:00.000Z"),
    order("UntaggedSuper", null, "2026-11-04T17:00:00.000Z", {
      payment_route: "superadmin", visibility_scope: "superadmin_private",
    }),
  ];
  const anshu = await readPortalMonth(rows, "anshu");
  assert.equal(anshu.status, 200);
  assert.deepEqual(anshu.body.transactions.map((row) => row.name), ["AnshuFirst", "AnshuSuper"]);
  for (const row of anshu.body.transactions) {
    assert.deepEqual(Object.keys(row).sort(), ["amount", "createdAt", "email", "name"]);
    assert.match(row.email, /-order@example\.invalid$/);
  }
  assert.doesNotMatch(JSON.stringify(anshu.body), /unrelatedPrivateValue|must not appear|raw_payment/);

  const badal = await readPortalMonth(rows, "badal");
  assert.deepEqual(badal.body.transactions.map((row) => row.name), ["BadalFirst"]);
  assert.deepEqual(Object.keys(badal.body.transactions[0]).sort(), ["amount", "createdAt", "email", "name"]);
  assert.deepEqual((await readPortalMonth(rows, "anshu", "2026-10")).body.transactions, []);
  assert.equal((await readPortalMonth(rows, "unknown")).status, 403);
});

test("changing a recent SuperAdmin order's tag moves it between the two social portals", async () => {
  const order = {
    display_name: "Reassigned",
    social_source: null,
    amount: 11,
    created_at: "2026-11-04T12:00:00.000Z",
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
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions.map((row) => row.name), ["Reassigned"]);
  assert.deepEqual((await readPortalMonth(rows, "badal")).body.transactions, []);
  order.social_source = "badal";
  assert.deepEqual((await readPortalMonth(rows, "anshu")).body.transactions, []);
  assert.deepEqual((await readPortalMonth(rows, "badal")).body.transactions.map((row) => row.name), ["Reassigned"]);
});

test("social order cards show paid amount without credited details", () => {
  const app = read("src/app.js");
  const styles = read("src/styles.css");
  assert.match(app, /paidLabel\.textContent = "Paid"/);
  assert.match(app, /row\.append\(identity, paid\)/);
  assert.doesNotMatch(app, /Credited|getSocialNetAmount|social-order-amounts/);
  assert.doesNotMatch(styles, /social-order-amounts/);
});

test("Admin and SuperAdmin tagging stays within each role's completed PayPal orders", async () => {
  const endpoint = read("supabase/functions/admin-donations/index.ts");
  const app = read("src/app.js");
  const update = endpoint.match(/if \(Object\.hasOwn\(body, "socialSource"\)\) \{[\s\S]*?return jsonResponse\(\{ donationId: data\.id, socialSource: data\.social_source \}\);\s*\}/)?.[0];
  assert.ok(update);
  assert.match(update, /adminProfile\.role !== "admin" && adminProfile\.role !== "super_admin"/);
  assert.match(update, /socialSource !== "anshu" && socialSource !== "badal"/);
  assert.match(update, /\.update\(\{ social_source: socialSource \}\)/);
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
    { id: "admin-new", payment_route: "standard", visibility_scope: "public", payment_method: "paypal", paypal_status: "COMPLETED", created_at: "2026-11-04T00:00:00.000Z", social_source: null },
    { id: "super-new", payment_route: "superadmin", visibility_scope: "superadmin_private", payment_method: "paypal", paypal_status: "COMPLETED", created_at: "2026-11-04T00:00:00.000Z", social_source: null },
    { id: "admin-old", payment_route: "standard", visibility_scope: "public", payment_method: "paypal", paypal_status: "COMPLETED", created_at: "2026-11-03T18:29:59.999Z", social_source: null },
    { id: "admin-dodo", payment_route: "standard", visibility_scope: "public", payment_method: "dodo", paypal_status: "COMPLETED", created_at: "2026-11-04T00:00:00.000Z", social_source: null },
  ];
  const supabase = { from(table) {
    assert.equal(table, "donations");
    let filters = [];
    let change;
    const query = {
      update(value) { change = value; return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      gte(key, value) { filters.push((row) => row[key] >= value); return query; },
      select() { return query; },
      async maybeSingle() {
        const row = rows.find((item) => filters.every((filter) => filter(item)));
        if (row) Object.assign(row, change);
        return { data: row ? { id: row.id, social_source: row.social_source } : null, error: null };
      },
    };
    return query;
  } };
  const assign = vm.runInNewContext(`(async (body, adminProfile) => { ${update} })`, {
    supabase,
    SOCIAL_PORTAL_START: "2026-11-03T18:30:00.000Z",
    errorResponse: (message, status) => ({ error: message, status }),
    jsonResponse: (value) => ({ ...value, status: 200 }),
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
  assert.equal((await assign({ donationId: "super-new", socialSource: "anshu" }, { role: "super_admin" })).status, 200);
  assert.equal(rows[1].social_source, "anshu");
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
    admin: { id: "user-admin", email: "admin@example.invalid" },
    standard: { id: "user-standard", email: "standard@example.invalid" },
    unknown: { id: "user-unknown", email: "unknown@example.invalid" },
  };
  const profiles = {
    admin_profiles: [
      { user_id: "user-admin", email: users.admin.email, display_name: "Admin", role: "admin" },
      { user_id: "user-standard", email: users.standard.email, display_name: "Old Portal", role: "standard" },
    ],
    social_portal_profiles: [
      { user_id: "user-a", email: users.anshu.email, display_name: "AnshuPortal", social_source: "anshu" },
      { user_id: "user-b", email: users.badal.email, display_name: "Badal Portal", social_source: "badal" },
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
  vm.runInContext(`${extract("getPortalProfile")}\n${extract("requireSocialPortal")}`, context);
  const request = (token) => ({ headers: new globalThis.Headers({ Authorization: `Bearer ${token}` }) });
  assert.equal((await context.requireSocialPortal(request("anshu"))).socialSource, "anshu");
  assert.equal((await context.requireSocialPortal(request("badal"))).socialSource, "badal");
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
  assert.match(app, /state\.adminProfile\?\.role === "social_partner"\) \{\s*openSocialPanel\(\);\s*await loadSocialTransactions\(\)/);
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
  assert.match(create, /social_source: parseSocialSource\(body\.sourceTag\)/);
  assert.match(prepare, /social_source: parseSocialSource\(body\.sourceTag\)/);
  assert.match(capture, /social_source: paymentAttempt\.social_source \|\| null/);
  assert.match(app, /function renderSocialCalendar\(\)[\s\S]*email\.textContent = transaction\.email/);
});
