import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import vm from "node:vm";
import { setImmediate } from "node:timers";

const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const extract = (name) => source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
const now = 1800000000000;
const fresh = { access_token: "new-access", refresh_token: "new-refresh", expires_at: now / 1000 + 3600 };
const response = (body, status = 200) => new globalThis.Response(JSON.stringify(body), { status });
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(fetcher, { expiresAt = now / 1000 - 1, legacy = false } = {}) {
  const storage = new Map([["session", JSON.stringify({ access_token: "old-access", refresh_token: "old-refresh", expires_at: expiresAt, ...(legacy ? {} : { portal_session_id: "login-A" }) })]]);
  const requests = [];
  let cleared = 0, uuid = 0;
  const context = vm.createContext({
    ADMIN_SESSION_KEY: "session", PUBLIC_CONFIG: { supabaseUrl: "https://local.invalid", supabaseAnonKey: "public-anon" },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    crypto: { randomUUID: () => `login-new-${++uuid}` }, FormData: globalThis.FormData,
    Date: class extends Date { static now() { return now; } },
    isBackendConfigured: () => true,
    clearAdminSession: () => { cleared++; storage.delete("session"); },
    fetch: async (url, options) => {
      const request = { url, ...options };
      requests.push(request);
      return fetcher(request);
    },
  });
  vm.runInContext(`let adminSessionRefreshPromise = null;\n${[
    "getAdminSession", "setAdminSession", "getAdminAccessToken", "getAdminSessionKey", "portalSessionError",
    "refreshAdminSession", "getValidAdminAccessToken", "edgeUrl", "callEdge",
  ].map(extract).join("\n")}`, context);
  return { context, requests, get session() { return JSON.parse(storage.get("session") || "null"); }, get cleared() { return cleared; } };
}

test("parallel portal reads renew an expiring session once and keep the same logical login", async () => {
  const renewal = deferred();
  const flow = setup((request) => request.url.endsWith("portal-login") ? renewal.promise : response({ ready: true }));
  const key = flow.context.getAdminSessionKey();
  const first = flow.context.callEdge("admin-profile", { admin: true, method: "GET" });
  const second = flow.context.callEdge("admin-donations?month=2026-11", { admin: true, method: "GET" });
  await tick();
  assert.equal(flow.requests.length, 1);
  assert.deepEqual(JSON.parse(flow.requests[0].body), { refreshToken: "old-refresh" });
  renewal.resolve(response(fresh));
  await Promise.all([first, second]);
  assert.equal(flow.requests.length, 3);
  assert.ok(flow.requests.slice(1).every((request) => request.headers.Authorization === "Bearer new-access"));
  assert.equal(flow.context.getAdminSessionKey(), key);
  assert.equal(flow.session.refresh_token, "new-refresh");
  assert.ok(flow.requests.every((request) => !request.url.includes("/auth/v1/")));
});

test("concurrent unauthorized reads refresh once and retry with the current user token", async () => {
  let renewals = 0;
  const flow = setup((request) => {
    if (request.url.endsWith("portal-login")) { renewals++; return response(fresh); }
    return request.headers.Authorization === "Bearer new-access" ? response({ ready: true }) : response({ error: "Expired JWT" }, 401);
  }, { expiresAt: now / 1000 + 3600 });
  await Promise.all([
    flow.context.callEdge("admin-profile", { admin: true, method: "GET" }),
    flow.context.callEdge("admin-donations", { admin: true, method: "GET" }),
  ]);
  assert.equal(renewals, 1);
  assert.equal(flow.requests.length, 5);
  assert.equal(flow.cleared, 0);
});

test("a session still rejected after renewal stops after one retry and requests sign-in", async () => {
  const flow = setup((request) => request.url.endsWith("portal-login") ? response(fresh) : response({}, 401), { expiresAt: now / 1000 + 3600 });
  await assert.rejects(flow.context.callEdge("admin-profile", { admin: true, method: "GET" }), (error) => error.code === "SESSION_EXPIRED");
  assert.equal(flow.requests.length, 3);
  assert.equal(flow.cleared, 1);
  assert.equal(flow.session, null);
});

test("invalid refresh credentials clear only that login while temporary outages preserve it", async () => {
  for (const status of [401, 503]) {
    const flow = setup(() => response({ error: status === 401 ? "Expired refresh token" : "Temporarily unavailable" }, status));
    await assert.rejects(flow.context.callEdge("admin-profile", { admin: true, method: "GET" }), (error) => error.status === status);
    assert.equal(flow.requests.length, 1);
    assert.equal(flow.cleared, status === 401 ? 1 : 0);
    if (status === 503) assert.equal(flow.session.refresh_token, "old-refresh");
  }
  const offline = setup(() => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(offline.context.callEdge("admin-profile", { admin: true, method: "GET" }), (error) => error.code === "NETWORK_ERROR" && /portal service/.test(error.message));
  assert.equal(offline.session.refresh_token, "old-refresh");
  assert.equal(offline.cleared, 0);
});

test("a slow refresh cannot replace a different account that signs in while it is pending", async () => {
  const renewal = deferred();
  const flow = setup(() => renewal.promise);
  const oldRequest = flow.context.callEdge("admin-profile", { admin: true, method: "GET" });
  await tick();
  flow.context.setAdminSession({ access_token: "account-B-access", refresh_token: "account-B-refresh", expires_at: now / 1000 + 3600 });
  renewal.resolve(response(fresh));
  await assert.rejects(oldRequest, /session changed/);
  assert.equal(flow.session.access_token, "account-B-access");
  assert.equal(flow.cleared, 0);
  assert.equal(flow.requests.length, 1);
});

test("a stale unauthorized response cannot refresh or clear a newer account", async () => {
  const delayed = deferred();
  const flow = setup(() => delayed.promise, { expiresAt: now / 1000 + 3600 });
  const oldRequest = flow.context.callEdge("admin-profile", { admin: true, method: "GET" });
  await tick();
  flow.context.setAdminSession({ access_token: "account-B-access", refresh_token: "account-B-refresh", expires_at: now / 1000 + 3600 });
  delayed.resolve(response({}, 401));
  await assert.rejects(oldRequest, /session changed/);
  assert.equal(flow.session.access_token, "account-B-access");
  assert.equal(flow.requests.length, 1);
  assert.equal(flow.cleared, 0);
});

test("legacy sessions gain a stable request key when their tokens renew", async () => {
  const flow = setup((request) => request.url.endsWith("portal-login") ? response(fresh) : response({ ready: true }), { legacy: true });
  const oldKey = flow.context.getAdminSessionKey();
  await flow.context.callEdge("admin-profile", { admin: true, method: "GET" });
  assert.equal(flow.context.getAdminSessionKey(), oldKey);
  assert.equal(flow.session.access_token, "new-access");
  assert.notEqual(flow.session.portal_session_id, "old-access");
});

test("payment requests never trigger session renewal or automatic replay", async () => {
  for (const mode of ["network", "unauthorized"]) {
    const flow = setup(() => {
      if (mode === "network") throw new TypeError("Failed to fetch");
      return response({ error: "Rejected" }, 401);
    });
    await assert.rejects(flow.context.callEdge("capture-paypal-order", { body: { orderId: "EXISTING-ORDER" } }));
    assert.equal(flow.requests.length, 1);
    assert.match(flow.requests[0].url, /capture-paypal-order$/);
    assert.equal(flow.requests[0].headers.Authorization, "Bearer public-anon");
    assert.equal(flow.cleared, 0);
  }
});

test("malformed renewal responses cannot overwrite saved credentials", async () => {
  const flow = setup(() => response({ access_token: "incomplete" }));
  await assert.rejects(flow.context.callEdge("admin-profile", { admin: true, method: "GET" }), /did not return a renewed/);
  assert.equal(flow.session.access_token, "old-access");
  assert.equal(flow.session.refresh_token, "old-refresh");
});


test("a successful response from a replaced account is rejected before it can update a portal profile", async () => {
  const delayed = deferred();
  const flow = setup(() => delayed.promise, { expiresAt: now / 1000 + 3600 });
  const oldRequest = flow.context.callEdge("admin-profile", { admin: true, method: "GET" });
  await tick();
  flow.context.setAdminSession({ access_token: "account-B-access", refresh_token: "account-B-refresh", expires_at: now / 1000 + 3600 });
  delayed.resolve(response({ profile: { role: "super_admin" } }));
  await assert.rejects(oldRequest, /session changed/);
  assert.equal(flow.session.access_token, "account-B-access");
  assert.equal(flow.cleared, 0);
});


test("late refresh success or rejection cannot overwrite tokens already renewed in another tab", async () => {
  for (const status of [200, 401]) {
    const renewal = deferred();
    const flow = setup((request) => request.url.endsWith("portal-login") ? renewal.promise : response({ ready: true }));
    const pending = flow.context.callEdge("admin-profile", { admin: true, method: "GET" });
    await tick();
    flow.context.setAdminSession({ access_token: "current-renewed-access", refresh_token: "current-renewed-refresh", expires_at: now / 1000 + 3600 }, "login-A");
    renewal.resolve(response(status === 200 ? fresh : { error: "Old token already used" }, status));
    await pending;
    assert.equal(flow.session.access_token, "current-renewed-access");
    assert.equal(flow.session.refresh_token, "current-renewed-refresh");
    assert.equal(flow.requests[1].headers.Authorization, "Bearer current-renewed-access");
    assert.equal(flow.cleared, 0);
  }
});

test("a rejected older retry cannot clear a session whose token has already renewed", async () => {
  const delayed = deferred();
  const flow = setup(() => delayed.promise, { expiresAt: now / 1000 + 3600 });
  const pending = flow.context.callEdge("admin-profile", { admin: true, method: "GET", sessionRetried: true });
  await tick();
  flow.context.setAdminSession({ access_token: "current-renewed-access", refresh_token: "current-renewed-refresh", expires_at: now / 1000 + 3600 }, "login-A");
  delayed.resolve(response({}, 401));
  await assert.rejects(pending, (error) => error.code === "SESSION_EXPIRED");
  assert.equal(flow.session.access_token, "current-renewed-access");
  assert.equal(flow.cleared, 0);
});
