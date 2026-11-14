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
        assert.equal(table, "unified_payment_portal_profiles");
        const query = {
          select(fields) { assert.equal(fields, "user_id, email"); return query; },
          eq(field, value) { assert.equal(field, "login_username"); lookedUp = value; return query; },
          async maybeSingle() {
            if (failLookup) return { error: new Error("Private database details") };
            return { data: lookedUp === "client@3" ? { user_id: "unified-user", email: "private-alias@example.invalid" } : null };
          },
        };
        return query;
      },
      auth: {
        async signInWithPassword(credentials) {
          authCalls.push(credentials);
          assert.equal(credentials.email, "private-alias@example.invalid");
          if (credentials.password !== "test-password") return { error: new Error("Invalid login") };
          return { data: { user: { id: wrongIdentity ? "other-user" : "unified-user" }, session: {
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

test("unified calendar filters by each record's partner and rejects a stale session response", async () => {
  const app = read("src/app.js");
  const load = app.match(/async function loadSocialTransactions\(\)[^]*?\n\}/)[0];
  const payload = { transactions: [
    { name: "AnshuLow", socialSource: "anshu", amount: 11, createdAt: "2026-11-14T00:00:00.000Z" },
    { name: "BadalEarlier", socialSource: "badal", amount: 121, createdAt: "2026-11-04T00:00:00.000Z" },
    { name: "AlokEarlierHigh", socialSource: "alok", amount: 55, createdAt: "2026-11-04T00:00:00.000Z" },
    { name: "SuperAdminOnly", socialSource: "anshu", amount: 55, createdAt: "2026-11-14T00:00:00.000Z" },
    { name: "Untagged", amount: 11, createdAt: "2026-11-14T00:00:00.000Z" },
  ] };
  let resolvePending;
  let pending = false;
  const context = vm.createContext({
    socialCalendarCursor: new Date(), socialTransactions: [],
    SOCIAL_HIGH_VALUE_EXCLUSION_START_ISO: "2026-11-10T16:00:40.000Z",
    state: { adminProfile: { role: "unified_payment" } },
    elements: { socialCalendarPrev: {}, socialCalendarNext: {}, socialCalendarDetails: {} },
    getMonthKey: () => "2026-11", getAdminAccessToken: () => "session",
    callEdge: async (name) => {
      assert.equal(name, "unified-portal-transactions?month=2026-11");
      if (pending) return new Promise((resolve) => { resolvePending = resolve; });
      return payload;
    },
    renderSocialCalendar() {},
  });
  vm.runInContext(load, context);
  await context.loadSocialTransactions();
  assert.deepEqual(Array.from(context.socialTransactions, (row) => row.name), ["AnshuLow", "BadalEarlier"]);
  pending = true;
  const response = context.loadSocialTransactions();
  context.state.adminProfile = { role: "social_partner", socialSource: "alok" };
  context.socialTransactions = [];
  resolvePending(payload);
  await response;
  assert.equal(context.socialTransactions.length, 0);
});
