import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, URLSearchParams } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "src/app.js"), "utf8");
const endpoint = readFileSync(path.join(root, "supabase/functions/admin-donations/index.ts"), "utf8");
const source = (text, name) => {
  const match = text.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing ${name}`);
  return match[0];
};

function createCalendar() {
  const requests = [];
  const errors = [];
  const context = vm.createContext({
    URLSearchParams,
    token: "admin-session",
    state: { adminProfile: { role: "admin" }, donations: [{ id: "public-order" }], settings: {} },
    isBackendConfigured: () => true,
    getAdminAccessToken: () => context.token,
    normalizeSettings: (settings) => settings,
    formatMonthTitle: (date) => String(date),
    renderAdminCalendar: () => {},
    setAdminStatus: () => {},
    showToast: (message) => errors.push(message),
    callEdge: (url) => new Promise((resolve, reject) => requests.push({ url, resolve, reject })),
  });
  vm.runInContext(`
    let adminCalendarCursor = new Date(2026, 9, 1);
    let adminCalendarDonations = [];
    let adminCalendarRequestId = 0;
    let adminCalendarLoadedMonth = "";
    let adminCalendarLoading = false;
    let adminCalendarError = "";
    let publicContentLoading = false;
    ${source(app, "getMonthKey")}
    ${source(app, "loadAdminDonations")}
    ${source(app, "applyBootstrap")}
    function snapshot() {
      return JSON.stringify({ records: adminCalendarDonations, month: adminCalendarLoadedMonth,
        loading: adminCalendarLoading, error: adminCalendarError, publicRecords: state.donations });
    }
  `, context);
  return { context, requests, errors, snapshot: () => JSON.parse(context.snapshot()) };
}

test("a slower month response cannot overwrite the month currently selected", async () => {
  const calendar = createCalendar();
  const first = calendar.context.loadAdminDonations();
  vm.runInContext("adminCalendarCursor = new Date(2026, 10, 1)", calendar.context);
  const second = calendar.context.loadAdminDonations();
  assert.match(calendar.requests[0].url, /month=2026-10/);
  assert.match(calendar.requests[1].url, /month=2026-11/);
  assert.match(calendar.requests[1].url, /startOffset=/);
  calendar.requests[1].resolve({ donations: [{ id: "november-order" }] });
  await second;
  calendar.requests[0].resolve({ donations: [{ id: "october-order" }] });
  await first;
  assert.deepEqual(calendar.snapshot(), {
    records: [{ id: "november-order" }], month: "2026-11", loading: false, error: "",
    publicRecords: [{ id: "public-order" }],
  });
});

test("stale errors do not replace the current month's loading state", async () => {
  const calendar = createCalendar();
  const first = calendar.context.loadAdminDonations();
  vm.runInContext("adminCalendarCursor = new Date(2026, 10, 1)", calendar.context);
  const second = calendar.context.loadAdminDonations();
  calendar.requests[0].reject(new Error("Old request failed"));
  await first;
  assert.equal(calendar.snapshot().loading, true);
  assert.equal(calendar.snapshot().error, "");
  assert.deepEqual(calendar.errors, []);
  calendar.requests[1].resolve({ donations: [] });
  await second;
  assert.equal(calendar.snapshot().loading, false);
});

test("a response from a closed or replaced session cannot populate another portal", async () => {
  const calendar = createCalendar();
  calendar.context.state.adminProfile.role = "super_admin";
  const pending = calendar.context.loadAdminDonations();
  calendar.context.token = "different-session";
  calendar.context.state.adminProfile = { role: "admin" };
  calendar.requests[0].resolve({ donations: [{ id: "private-superadmin-order" }] });
  await pending;
  assert.deepEqual(calendar.snapshot().records, []);
  assert.deepEqual(calendar.snapshot().publicRecords, [{ id: "public-order" }]);
});

test("a late SuperAdmin activity response cannot appear in the Admin portal", async () => {
  const requests = [];
  const context = vm.createContext({
    token: "super-session",
    state: { adminProfile: { role: "super_admin" }, analytics: { paymentRoute: "superadmin", pageViewsLast24h: 4 } },
    isBackendConfigured: () => true,
    getAdminAccessToken: () => context.token,
    normalizeAnalytics: (payload) => payload,
    setAdminStatus: () => {},
    showToast: () => {},
    renderAdminAnalytics: () => {},
    callEdge: () => new Promise((resolve) => requests.push(resolve)),
  });
  vm.runInContext(source(app, "loadAdminAnalytics"), context);
  const superRequest = context.loadAdminAnalytics();
  context.token = "admin-session";
  context.state.adminProfile = { role: "admin" };
  context.state.analytics = { paymentRoute: "standard", pageViewsLast24h: 0 };
  requests[0]({ paymentRoute: "superadmin", pageViewsAreCombined: true, pageViewsLast24h: 4 });
  await superRequest;
  assert.deepEqual(context.state.analytics, { paymentRoute: "standard", pageViewsLast24h: 0 });

  const adminRequest = context.loadAdminAnalytics();
  requests[1]({ paymentRoute: "standard", pageViewsAreCombined: false, pageViewsLast24h: 2 });
  await adminRequest;
  assert.equal(context.state.analytics.pageViewsLast24h, 2);
});

test("public content refreshes cannot replace private calendar records", async () => {
  const calendar = createCalendar();
  calendar.context.state.adminProfile.role = "super_admin";
  const pending = calendar.context.loadAdminDonations();
  calendar.requests[0].resolve({ donations: [{ id: "private-order", digitalOrder: { fulfillmentNote: "Saved note" } }] });
  await pending;
  calendar.context.applyBootstrap({ donations: [{ id: "fresh-public-order" }] });
  assert.deepEqual(calendar.snapshot().records, [{ id: "private-order", digitalOrder: { fulfillmentNote: "Saved note" } }]);
  assert.deepEqual(calendar.snapshot().publicRecords, [{ id: "fresh-public-order" }]);
  assert.doesNotMatch(source(app, "renderApp"), /renderAdminCalendar/);
});

test("failed refreshes preserve the loaded month and expose a retryable error", async () => {
  const calendar = createCalendar();
  const first = calendar.context.loadAdminDonations();
  calendar.requests[0].resolve({ donations: [{ id: "saved-order" }] });
  await first;
  const second = calendar.context.loadAdminDonations();
  calendar.requests[1].reject(new Error("Connection interrupted"));
  await second;
  assert.deepEqual(calendar.snapshot().records, [{ id: "saved-order" }]);
  assert.equal(calendar.snapshot().error, "Connection interrupted");
  assert.equal(calendar.snapshot().loading, false);
});

test("calendar month ranges include local midnight and daylight saving boundaries", () => {
  const rangeSource = source(endpoint, "getCalendarMonthRange").replace(/: (?:string|number)/g, "");
  const range = vm.runInNewContext(`${rangeSource}; getCalendarMonthRange`);
  const india = range("2026-11", -330, -330);
  assert.equal(india.start, "2026-10-31T18:30:00.000Z");
  assert.equal(india.end, "2026-11-30T18:30:00.000Z");
  const daylightSaving = range("2026-11", 240, 300);
  assert.equal(daylightSaving.start, "2026-11-01T04:00:00.000Z");
  assert.equal(daylightSaving.end, "2026-12-01T05:00:00.000Z");
  assert.throws(() => range("2026-13", 0, 0), /Invalid calendar/);
  assert.throws(() => range("2026-11", 1000, 0), /Invalid calendar/);
});

test("months with more than 500 orders are fully read and failed pages are not shown as complete", async () => {
  const loadSource = source(endpoint, "loadCalendarDonations")
    .replace("query: any", "query")
    .replace("new Map<string, Record<string, any>>()", "new Map()")
    .replace(" as Array<Record<string, any>>", "");
  const load = vm.runInNewContext(`${loadSource}; loadCalendarDonations`);
  const records = Array.from({ length: 1001 }, (_, id) => ({ id: String(id) }));
  const ranges = [];
  const donations = await load({ range: async (start, end) => {
    ranges.push([start, end]);
    return { data: records.slice(start, end + 1) };
  } });
  assert.equal(donations.length, 1001);
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);
  await assert.rejects(load({ range: async (start, end) => start === 0
    ? { data: records.slice(start, end + 1) }
    : { error: new Error("Page unavailable") } }), /Page unavailable/);
});
