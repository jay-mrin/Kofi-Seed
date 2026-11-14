import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import vm from "node:vm";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const extract = (name) => app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];
const node = (tag = "div") => ({
  tag, children: [], attributes: {}, dataset: {}, hidden: false, textContent: "",
  append(...children) { this.children.push(...children); },
  replaceChildren(...children) { this.children = [...children]; },
  setAttribute(name, value) { this.attributes[name] = value; },
});
const textOf = (element) => [element.textContent, ...element.children.map(textOf)].join(" ");

function demoContext(role = "unified_payment") {
  const liveRecords = Object.freeze([Object.freeze({ name: "Actual customer", amount: 11, createdAt: "2026-11-15T00:00:00Z" })]);
  const context = vm.createContext({
    CONFIG: { currency: "USD" }, state: { adminProfile: { role } }, document: { createElement: node },
    elements: Object.fromEntries(["socialPortal", "unifiedDemoPayments", "unifiedDemoDates", "unifiedDemoDetails", "unifiedDemoTitle", "unifiedCalendarPrev", "unifiedCalendarNext"].map((name) => [name, node()])),
    socialTransactions: liveRecords, socialCalendarCursor: new Date(2026, 10, 15), selectedSocialDate: "2026-11-15",
    fetch: () => { throw new Error("Demo must not use the network"); },
    callEdge: () => { throw new Error("Demo must not call payment APIs"); },
  });
  vm.runInContext(["toDateKey", "fromDateKey", "formatMonthTitle", "money", "formatSocialOrderIndiaDateTime", "getSocialIndiaDateKey", "getUnifiedDemoPayments", "renderUnifiedDemoPayments", "setUnifiedPaymentView"].map(extract).join("\n"), context);
  return { context, liveRecords };
}

test("fictional demo records have stable India-time daily totals in the requested range and no portal linkage", () => {
  const { context } = demoContext();
  const records = context.getUnifiedDemoPayments();
  const totals = new Map();
  const ids = new Set();
  for (const record of records) {
    const date = context.getSocialIndiaDateKey(record.createdAt);
    totals.set(date, (totals.get(date) || 0) + Math.round(record.amount * 100));
    assert.equal(record.isDemo, true);
    assert.match(record.id, /^DEMO-/);
    assert.match(record.name, /^[A-Z][a-z]+ [A-Z][a-z]+$/);
    assert.doesNotMatch(record.name, /demo|sample|customer/i);
    assert.match(record.email, /@example\.invalid$/);
    for (const key of ["socialSource", "paymentRoute", "paypalOrderId", "paypalCaptureId"]) assert.equal(record[key], undefined);
    ids.add(record.id);
  }
  assert.equal(ids.size, records.length);
  assert.equal(new Set(records.map((record) => record.name)).size, records.length);
  assert.deepEqual(context.getUnifiedDemoPayments(), records);
  assert.deepEqual([...totals], [["2026-11-12", 59400], ["2026-11-13", 63800], ["2026-11-14", 68200]]);
  for (const total of totals.values()) assert.ok(total >= 55000 && total <= 70000);
});

test("Unified shows simple payment records with varied names and preserves stored live records", () => {
  const { context, liveRecords } = demoContext();
  const originalCursor = context.socialCalendarCursor;
  context.setUnifiedPaymentView();
  assert.equal(context.elements.socialPortal.hidden, true);
  assert.equal(context.elements.unifiedDemoPayments.hidden, false);
  const days = context.elements.unifiedDemoDates.children.filter((day) => day.dataset.unifiedDemoDate);
  assert.equal(days.length, 30);
  assert.equal(context.elements.unifiedDemoTitle.textContent, "November 2026");
  assert.deepEqual(days.filter((day) => day.children.length > 1).map((day) => day.children[1].textContent), ["$594", "$638", "$682"]);
  for (const [date, count] of [["2026-11-12", 21], ["2026-11-13", 22], ["2026-11-14", 23]]) {
    context.renderUnifiedDemoPayments(date);
    assert.doesNotMatch(textOf(context.elements.unifiedDemoDates), /demo|sample|fictional|synthetic|no real payments/i);
    const rows = context.elements.unifiedDemoDetails.children.slice(1);
    assert.equal(rows.length, count);
    for (const row of rows) {
      assert.match(textOf(row), /Amount/);
      assert.doesNotMatch(textOf(row), /@/);
      assert.doesNotMatch(textOf(row), /demo|sample|fictional|synthetic|no real payments|IST IST/i);
      assert.doesNotMatch(textOf(row), /Actual customer|AnshuPortal|Badal Portal|Rohit Portal|Alok Portal/);
    }
  }
  context.setUnifiedPaymentView();
  assert.equal(context.elements.socialPortal.hidden, true);
  assert.equal(context.elements.unifiedDemoPayments.hidden, false);
  assert.equal(context.socialTransactions, liveRecords);
  assert.equal(context.socialTransactions.length, 1);
  assert.equal(context.socialTransactions[0].amount, 11);
  assert.equal(context.socialCalendarCursor, originalCursor);
  assert.equal(context.selectedSocialDate, "2026-11-15");
});

test("other portal roles cannot open or populate the demo view", () => {
  for (const role of ["admin", "super_admin", "social_partner", undefined]) {
    const { context } = demoContext(role);
    context.state.adminProfile = { role };
    context.setUnifiedPaymentView();
    context.renderUnifiedDemoPayments();
    assert.equal(context.elements.unifiedDemoPayments.hidden, true);
    assert.equal(context.elements.socialPortal.hidden, false);
    assert.equal(context.elements.unifiedDemoDates.children.length, 0);
    assert.equal(context.elements.unifiedDemoDetails.children.length, 0);
  }
});

test("Unified markup shows payment records without demo, sample, or fictional-data notices", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sampleSection = html.match(/<section[^>]*id="unifiedDemoPayments"[^]*?<\/section>/)[0];
  assert.doesNotMatch(html, /id="unifiedRecordsButton"|id="unifiedDemoButton"|id="unifiedPaymentViews"/);
  assert.doesNotMatch(sampleSection, />[^<]*(?:demo|sample|fictional|synthetic|no payments)[^<]*</i);
  assert.match(sampleSection, />Payment records</);
  assert.doesNotMatch(sampleSection, /Select a sample date/);
});

test("Unified calendar navigates months, aligns weekdays, and handles empty dates without fetching", () => {
  const { context } = demoContext();
  context.renderUnifiedDemoPayments("2026-11-14");
  const day = context.elements.unifiedDemoDates.children.find((item) => item.dataset.unifiedDemoDate === "2026-11-14");
  assert.equal(day.attributes["aria-selected"], "true");
  assert.match(day.attributes["aria-label"], /23 records, total \$682/);
  assert.equal(context.elements.unifiedCalendarPrev.dataset.unifiedDemoDate, "2026-10-01");
  assert.equal(context.elements.unifiedCalendarNext.dataset.unifiedDemoDate, "2026-12-01");
  context.renderUnifiedDemoPayments(context.elements.unifiedCalendarNext.dataset.unifiedDemoDate);
  assert.equal(context.elements.unifiedDemoTitle.textContent, "December 2026");
  const cells = context.elements.unifiedDemoDates.children;
  assert.equal(cells.length, 33);
  assert.equal(cells[0].attributes.role, "presentation");
  assert.equal(cells[1].attributes.role, "presentation");
  assert.equal(cells[2].dataset.unifiedDemoDate, "2026-12-01");
  assert.match(textOf(context.elements.unifiedDemoDetails), /No payment records on this date/);
  context.renderUnifiedDemoPayments("2027-01-01");
  assert.equal(context.elements.unifiedCalendarPrev.dataset.unifiedDemoDate, "2026-12-01");
  context.renderUnifiedDemoPayments("invalid");
  assert.equal(context.elements.unifiedDemoTitle.textContent, "November 2026");
});
