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

test("selected-day orders and totals collapse together, preserve expansion on refresh, and reset for a different day", () => {
  let previousCard = null;
  const details = { innerHTML: "", querySelector: () => previousCard };
  const donation = Object.freeze({ id: "saved-order", name: "Customer", amount: 11, createdAt: "2026-11-03T10:00:00Z", isPreview: true });
  const context = { details, loaded: true, selectedDate: "2026-11-03", cursor: new Date(2026, 10, 1), emptyRecordLabel: "Admin orders", donations: Object.freeze([donation]) };
  const render = vm.runInNewContext(`${source(app, "getCalendarMonthDonations")}
    ${source(app, "getCalendarSummaryMarkup")}
    ${source(app, "renderCalendarDetails")}; renderCalendarDetails`, {
    getDonationsByDate: (donations) => ({ "2026-11-03": donations, "2026-11-04": donations }),
    fromDateKey: (date) => date,
    readableDate: (date) => date,
    readableTime: () => "10:00 AM",
    formatMonthTitle: () => "November 2026",
    money: (amount) => `$${amount}`,
    escapeHtml: (value) => String(value),
    getDigitalOrder: () => null,
    getDigitalOrderValue: (_donation, _key, fallback) => fallback,
    getDonationRawValue: (_donation, _key, fallback) => fallback,
    getAdminOrderItemLabel: (item) => item,
    getFulfillmentStatusLabel: () => "Unfulfilled",
    DIGITAL_ORDER_ITEM_NAME: "Seed",
  });
  const isExpanded = () => /<details\b[^>]*\sopen(?:\s|>)/.test(details.innerHTML);

  render(context);
  assert.equal(isExpanded(), false);
  assert.match(details.innerHTML, /<summary[^>]*>[\s\S]*2026-11-03[\s\S]*1 order · \$11[\s\S]*<\/summary>/);
  assert.match(details.innerHTML, /<\/summary>[\s\S]*Customer[\s\S]*<\/details>/);
  assert.match(details.innerHTML, /<\/summary>[\s\S]*class="admin-calendar-summary"[\s\S]*1 order selected day[\s\S]*November 2026[\s\S]*1 order this month[\s\S]*<\/details>/);

  previousCard = { open: true, dataset: { date: "2026-11-03" } };
  render(context);
  assert.equal(isExpanded(), true);

  previousCard.open = false;
  render(context);
  assert.equal(isExpanded(), false);

  previousCard.open = true;
  context.selectedDate = "2026-11-04";
  render(context);
  assert.equal(isExpanded(), false);
  assert.equal(context.donations[0], donation);

  context.donations = [];
  render(context);
  assert.equal(isExpanded(), false);
  assert.match(details.innerHTML, /No Admin orders recorded on this day/);
  assert.match(details.innerHTML, /0 orders selected day[\s\S]*0 orders this month[\s\S]*<\/details>/);
});

test("Admin and SuperAdmin order cards show only eligible portal assignments and allow switching", () => {
  const details = { innerHTML: "", querySelector: () => null };
  const donation = {
    id: "private-order", name: "Customer", amount: 11,
    createdAt: "2026-11-04T12:00:00.000Z", paymentMethod: "paypal", status: "COMPLETED",
    paymentRoute: "superadmin", visibilityScope: "superadmin_private", socialSource: null,
  };
  const context = {
    details, loaded: true, selectedDate: "2026-11-04", cursor: new Date(2026, 10, 1),
    emptyRecordLabel: "SuperAdmin PayPal orders", donations: [donation],
    allowDelete: true, allowSocialTagging: true, isAdminPortal: false,
  };
  const render = vm.runInNewContext(`${source(app, "getCalendarMonthDonations")}
    ${source(app, "getCalendarSummaryMarkup")}
    ${source(app, "renderCalendarDetails")}; renderCalendarDetails`, {
    SOCIAL_PORTAL_START_ISO: "2026-11-03T18:30:00.000Z",
    SOCIAL_HIGH_VALUE_EXCLUSION_START_ISO: "2026-11-10T16:00:40.000Z",
    getDonationsByDate: (donations) => ({ "2026-11-04": donations }),
    fromDateKey: (date) => date,
    readableDate: (date) => date,
    readableTime: () => "5:30 PM",
    formatMonthTitle: () => "November 2026",
    money: (amount) => `$${amount}`,
    escapeHtml: (value) => String(value),
    getDigitalOrder: () => null,
    getDigitalOrderValue: (_donation, _key, fallback) => fallback,
    getDonationRawValue: (_donation, _key, fallback) => fallback,
    getAdminOrderItemLabel: (item) => item,
    getFulfillmentStatusLabel: () => "Unfulfilled",
    DIGITAL_ORDER_ITEM_NAME: "Seed",
  });
  const tagButtons = () => [...details.innerHTML.matchAll(/<button[^>]*data-set-order-social-source="(anshu|badal)"[^>]*>/g)]
    .map((match) => match[0]);

  render(context);
  assert.match(details.innerHTML, /Delete order<\/button>[\s\S]*Portal: Unassigned/);
  assert.equal(tagButtons().length, 2);
  assert.ok(tagButtons().every((button) => !button.includes("disabled")));

  donation.socialSource = "anshu";
  render(context);
  assert.match(details.innerHTML, /Portal: AnshuPortal/);
  assert.match(tagButtons()[0], /aria-pressed="true" disabled/);
  assert.match(tagButtons()[1], /aria-pressed="false"/);
  assert.doesNotMatch(tagButtons()[1], /disabled/);

  donation.amount = 55;
  donation.socialSourceManuallyAssigned = false;
  render(context);
  assert.match(details.innerHTML, /Portal: AnshuPortal/);
  donation.createdAt = "2026-11-10T16:00:40.000Z";
  donation.socialAssignmentApproved = true;
  render(context);
  assert.match(details.innerHTML, /Portal: SuperAdmin only/);
  assert.ok(tagButtons().every((button) => button.includes("disabled")));
  donation.amount = 11;

  donation.createdAt = "2026-11-03T18:29:59.999Z";
  render(context);
  assert.match(details.innerHTML, /Portal: Not eligible/);
  assert.ok(tagButtons().every((button) => button.includes("disabled")));

  const adminDonation = {
    ...donation,
    id: "admin-order",
    createdAt: "2026-11-04T12:00:00.000Z",
    paymentRoute: "standard",
    visibilityScope: "public",
    socialSource: null,
  };
  context.isAdminPortal = true;
  context.allowDelete = false;
  context.donations = [adminDonation];
  render(context);
  assert.match(details.innerHTML, /Portal: Unassigned/);
  assert.ok(tagButtons().every((button) => !button.includes("disabled")));

  adminDonation.socialSource = "anshu";
  render(context);
  assert.match(details.innerHTML, /Portal: AnshuPortal/);
  assert.match(tagButtons()[0], /aria-pressed="true" disabled/);
  assert.doesNotMatch(tagButtons()[1], /disabled/);

  adminDonation.paymentMethod = "dodo";
  render(context);
  assert.match(details.innerHTML, /Portal: Not eligible/);
  assert.ok(tagButtons().every((button) => button.includes("disabled")));
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
