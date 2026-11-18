import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import vm from "node:vm";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const loginSource = read("supabase/functions/portal-login/index.ts")
  .replace(/^import .*;\n/gm, "")
  .replace(/readJson<.*>\(request\)/g, "readJson(request)");

async function usernameLogin(body, { method = "POST", wrongIdentity = false, failLookup = false, profileDenied = false, refreshInvalid = false, serviceUnavailable = false } = {}) {
  let handler;
  let lookedUp;
  const authCalls = [];
  let authenticatedId = "";
  const context = vm.createContext({
    Deno: { serve: (callback) => { handler = callback; } },
    withCors: (callback) => callback, handleOptions: () => null,
    readJson: async () => body,
    errorResponse: (error, status) => ({ status, body: { error } }),
    jsonResponse: (value) => ({ status: 200, body: value, headers: new globalThis.Headers() }),
    Request: globalThis.Request, Response: globalThis.Response,
    getPortalProfile: async (request) => {
      assert.match(request.headers.get("Authorization"), /^Bearer (session-access|refreshed-access)$/);
      if (profileDenied) throw new globalThis.Response("Not a portal account", { status: 403 });
      return { profile: { userId: authenticatedId } };
    },
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
        async refreshSession(credentials) {
          authCalls.push(credentials);
          if (refreshInvalid) return { error: { status: 400 }, data: {} };
          if (serviceUnavailable) return { error: { status: 503 }, data: {} };
          assert.equal(credentials.refresh_token, "refresh-current");
          authenticatedId = "ayush-user";
          return { data: { user: { id: authenticatedId }, session: { access_token: "refreshed-access", refresh_token: "refreshed-token", token_type: "bearer", expires_in: 3600, expires_at: 1234 } } };
        },
        async signInWithPassword(credentials) {
          authCalls.push(credentials);
          assert.ok(["private-alias@example.invalid", "partner-alias@example.invalid", "admin@example.invalid"].includes(credentials.email));
          if (serviceUnavailable) return { error: { status: 503 }, data: {} };
          if (credentials.password !== "test-password") return { error: { status: 400 } };
          authenticatedId = wrongIdentity ? "other-user" : credentials.email === "partner-alias@example.invalid" ? "ayush-user" : credentials.email === "admin@example.invalid" ? "admin-user" : "unified-user";
          return { data: { user: { id: authenticatedId }, session: {
            access_token: "session-access", refresh_token: "session-refresh", token_type: "bearer", expires_in: 3600, expires_at: 1234,
            private_metadata: "must not leave server",
          } } };
        },
      },
    }),
  });
  vm.runInContext(loginSource, context);
  return { response: await handler({ method, url: "https://local.invalid/portal-login" }), authCalls };
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
  assert.equal(failed.response.status, 503);
  assert.doesNotMatch(JSON.stringify(failed.response.body), /Private database/);
});

test("frontend routes both usernames and emails through the working server sign-in path", async () => {
  const app = read("src/app.js");
  const signIn = app.match(/async function signInAdmin\([^]*?\n\}/)[0];
  const sessions = [];
  const calls = [];
  const context = vm.createContext({
    PUBLIC_CONFIG: { supabaseUrl: "https://local.invalid", supabaseAnonKey: "public-key" },
    setAdminSession: (session) => sessions.push(session),
    callEdge: async (name, options) => { calls.push({ name, body: options.body }); return { access_token: options.body.username.includes("example.invalid") ? "email-session" : "username-session", refresh_token: "session-refresh" }; },
    fetch: () => { throw new Error("Browser must not use the failing public Auth gateway"); },
  });
  vm.runInContext(signIn, context);
  await context.signInAdmin("client@3", "test-password");
  assert.equal(calls[0].name, "portal-login");
  assert.equal(calls[0].body.username, "client@3");
  await context.signInAdmin("anshu@example.invalid", "test-password");
  assert.equal(calls[1].name, "portal-login");
  assert.equal(calls[1].body.username, "anshu@example.invalid");
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


test("email sign-in is normalized and still requires an authorized portal profile", async () => {
  const result = await usernameLogin({ username: " ADMIN@EXAMPLE.INVALID ", password: "test-password" });
  assert.equal(result.response.status, 200);
  assert.equal(result.authCalls[0].email, "admin@example.invalid");
  assert.equal((await usernameLogin({ username: "admin@example.invalid", password: "wrong" })).response.status, 401);
  assert.equal((await usernameLogin({ username: "admin@example.invalid", password: "test-password" }, { profileDenied: true })).response.status, 401);
  assert.equal((await usernameLogin({ username: "admin@example.invalid", password: "test-password" }, { serviceUnavailable: true })).response.status, 503);
});

test("session renewal returns only user tokens and rechecks current portal access", async () => {
  const result = await usernameLogin({ refreshToken: "refresh-current" });
  assert.equal(result.response.status, 200);
  assert.equal(result.authCalls[0].refresh_token, "refresh-current");
  assert.equal(result.response.body.access_token, "refreshed-access");
  assert.deepEqual(Object.keys(result.response.body).sort(), ["access_token", "expires_at", "expires_in", "refresh_token", "token_type"]);
  assert.equal(result.response.headers.get("Cache-Control"), "no-store");
  assert.equal((await usernameLogin({ refreshToken: "refresh-current" }, { refreshInvalid: true })).response.status, 401);
  assert.equal((await usernameLogin({ refreshToken: "refresh-current" }, { profileDenied: true })).response.status, 401);
  assert.equal((await usernameLogin({ refreshToken: "refresh-current" }, { serviceUnavailable: true })).response.status, 503);
  for (const refreshToken of ["", 42, "x".repeat(4097)]) assert.equal((await usernameLogin({ refreshToken })).response.status, 401);
  assert.equal((await usernameLogin({ refreshToken: "refresh-current", username: "ayush", password: "test-password" })).response.status, 401);
});
