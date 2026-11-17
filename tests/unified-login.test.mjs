import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import vm from "node:vm";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const loginSource = read("supabase/functions/portal-login/index.ts")
  .replace(/^import .*;\n/gm, "")
  .replace(/readJson<.*>\(request\)/g, "readJson(request)");

async function usernameLogin(body, { method = "POST", wrongIdentity = false, failLookup = false } = {}) {
  let handler;
  let lookedUp;
  const authCalls = [];
  const context = vm.createContext({
    Deno: { serve: (callback) => { handler = callback; } },
    withCors: (callback) => callback, handleOptions: () => null,
    readJson: async () => body,
    errorResponse: (error, status) => ({ status, body: { error } }),
    jsonResponse: (value) => ({ status: 200, body: value, headers: new globalThis.Headers() }),
    getSupabaseAdmin: () => ({
      from(table) {
        assert.ok(["unified_payment_portal_profiles", "social_portal_profiles"].includes(table));
        const query = {
          select(fields) { assert.equal(fields, "user_id, email"); return query; },
          eq(field, value) { assert.equal(field, "login_username"); lookedUp = value; return query; },
          async maybeSingle() {
            if (failLookup) return { error: new Error("Private database details") };
            return { data: table === "unified_payment_portal_profiles" && lookedUp === "client@3" ? { user_id: "unified-user", email: "private-alias@example.invalid" } : table === "social_portal_profiles" && lookedUp === "ayush" ? { user_id: "ayush-user", email: "partner-alias@example.invalid" } : null };
          },
        };
        return query;
      },
      auth: {
        async signInWithPassword(credentials) {
          authCalls.push(credentials);
          assert.ok(["private-alias@example.invalid", "partner-alias@example.invalid"].includes(credentials.email));
          if (credentials.password !== "test-password") return { error: new Error("Invalid login") };
          return { data: { user: { id: wrongIdentity ? "other-user" : credentials.email === "partner-alias@example.invalid" ? "ayush-user" : "unified-user" }, session: {
            access_token: "session-access", refresh_token: "session-refresh", token_type: "bearer", expires_in: 3600, expires_at: 1234,
            private_metadata: "must not leave server",
          } } };
        },
      },
    }),
  });
  vm.runInContext(loginSource, context);
  return { response: await handler({ method }), authCalls };
}

test("username login resolves a normalized alias on the server and returns only session fields", async () => {
  const { response, authCalls } = await usernameLogin({ username: " CLIENT@3 ", password: "test-password" });
  assert.equal(response.status, 200);
  assert.equal(authCalls.length, 1);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Object.keys(response.body).sort(), ["access_token", "expires_at", "expires_in", "refresh_token", "token_type"]);
  assert.doesNotMatch(JSON.stringify(response.body), /private-alias|private_metadata|must not leave server/);
});

test("username login rejects invalid credentials, identity mismatches, and methods without exposing mappings", async () => {
  for (const body of [
    { username: "client@3", password: "wrong-password" },
    { username: "unknown", password: "test-password" },
    { username: "", password: "test-password" },
    { username: "client@3", password: 42 },
    { username: "x".repeat(129), password: "test-password" },
  ]) {
    const { response } = await usernameLogin(body);
    assert.equal(response.status, 401);
    assert.equal(response.body.error, "Invalid username or password.");
  }
  assert.equal((await usernameLogin({ username: "client@3", password: "test-password" }, { wrongIdentity: true })).response.status, 401);
  const get = await usernameLogin({}, { method: "GET" });
  assert.equal(get.response.status, 405);
  assert.equal(get.authCalls.length, 0);
  const failed = await usernameLogin({ username: "client@3", password: "test-password" }, { failLookup: true });
  assert.equal(failed.response.status, 500);
  assert.doesNotMatch(JSON.stringify(failed.response.body), /Private database/);
});

test("frontend accepts username login while preserving existing email sign-in and session handling", async () => {
  const app = read("src/app.js");
  const signIn = app.match(/async function signInAdmin\([^]*?\n\}/)[0];
  const sessions = [];
  const calls = [];
  const context = vm.createContext({
    PUBLIC_CONFIG: { supabaseUrl: "https://local.invalid", supabaseAnonKey: "public-key" },
    setAdminSession: (session) => sessions.push(session),
    callEdge: async (name, options) => { calls.push({ name, body: options.body }); return { access_token: "username-session" }; },
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return { ok: true, json: async () => ({ access_token: "email-session" }) };
    },
  });
  vm.runInContext(signIn, context);
  await context.signInAdmin("client@3", "test-password");
  assert.equal(calls[0].name, "portal-login");
  assert.equal(calls[0].body.username, "client@3");
  await context.signInAdmin("anshu@example.invalid", "test-password");
  assert.match(calls[1].url, /auth\/v1\/token\?grant_type=password$/);
  assert.equal(calls[1].body.email, "anshu@example.invalid");
  assert.deepEqual(sessions.map((session) => session.access_token), ["username-session", "email-session"]);
  assert.match(read("index.html"), /id="adminEmailInput" type="text" autocomplete="username"/);
  assert.doesNotMatch(app, /client3@2026|client@3/i);
});

test("Unified sample-only view does not load real payment records", async () => {
  const app = read("src/app.js");
  const load = app.match(/async function loadSocialTransactions\(\)[^]*?\n\}/)[0];
  const records = Object.freeze([]);
  const context = vm.createContext({
    state: { adminProfile: { role: "unified_payment" } },
    socialTransactions: records,
    callEdge: () => { throw new Error("Unified must not fetch real payments"); },
  });
  vm.runInContext(load, context);
  await context.loadSocialTransactions();
  assert.equal(context.socialTransactions, records);
});

test("unified calendar replaces dots with daily payment totals using India dates and exact cents", () => {
  const app = read("src/app.js");
  const extract = (name) => app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];
  const node = (tag) => ({
    tag, children: [], attributes: {}, dataset: {}, textContent: "",
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = [...children]; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  const grid = node("div");
  const context = vm.createContext({
    state: { adminProfile: { role: "unified_payment" } }, CONFIG: { currency: "USD" },
    document: { createElement: node },
    elements: { socialCalendarGrid: grid, socialCalendarDetails: node("div"), socialCalendarTitle: {} },
    socialCalendarCursor: new Date(2026, 10, 1), selectedSocialDate: "2026-11-01",
    socialTransactions: [
      { amount: 7, createdAt: "2026-11-13T18:29:59.999Z" },
      { amount: 11, createdAt: "2026-11-13T18:30:00.000Z" },
      { amount: 22, createdAt: "2026-11-14T10:00:00.000Z" },
      { amount: 0.1, createdAt: "2026-11-14T11:00:00.000Z" },
      { amount: 0.2, createdAt: "2026-11-14T12:00:00.000Z" },
    ],
    toDateKey: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    readableDate: (date) => String(date), fromDateKey: (date) => date,
    formatMonthTitle: () => "November 2026",
  });
  vm.runInContext(["money", "getSocialIndiaDateKey", "renderSocialCalendar"].map(extract).join("\n"), context);
  context.renderSocialCalendar();
  const day = (date) => grid.children.find((child) => child.dataset.socialCalendarDate === date);
  assert.equal(day("2026-11-13").children[1].textContent, "$7");
  assert.equal(day("2026-11-14").children[1].textContent, "$33.3");
  assert.equal(day("2026-11-14").children[1].className, "unified-day-total");
  assert.match(day("2026-11-14").attributes["aria-label"], /4 successful transactions, total \$33\.3$/);
  assert.equal(day("2026-11-15").children.length, 1);
  context.state.adminProfile = { role: "social_partner", socialSource: "anshu" };
  context.renderSocialCalendar();
  assert.equal(day("2026-11-14").children[1].textContent, "●");
  assert.doesNotMatch(day("2026-11-14").attributes["aria-label"], /total/);
});

test("partner username login verifies the matching Auth identity without exposing its alias", async () => {
  const { response, authCalls } = await usernameLogin({ username: " AYUSH ", password: "test-password" });
  assert.equal(response.status, 200);
  assert.equal(authCalls[0].email, "partner-alias@example.invalid");
  assert.doesNotMatch(JSON.stringify(response.body), /partner-alias|ayush-user/);
  assert.equal((await usernameLogin({ username: "ayush", password: "wrong-password" })).response.status, 401);
  assert.equal((await usernameLogin({ username: "ayush", password: "test-password" }, { wrongIdentity: true })).response.status, 401);
});
