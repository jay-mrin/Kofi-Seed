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
    elements: Object.fromEntries(["unifiedPaymentViews", "unifiedRecordsButton", "unifiedDemoButton", "socialPortal", "unifiedDemoPayments", "unifiedDemoDates", "unifiedDemoDetails"].map((name) => [name, node()])),
    socialTransactions: liveRecords, socialCalendarCursor: new Date(2026, 10, 15), selectedSocialDate: "2026-11-15",
    fetch: () => { throw new Error("Demo must not use the network"); },
    callEdge: () => { throw new Error("Demo must not call payment APIs"); },
  });
  vm.runInContext(["money", "formatSocialOrderIndiaDateTime", "getSocialIndiaDateKey", "getUnifiedDemoPayments", "renderUnifiedDemoPayments", "setUnifiedPaymentView"].map(extract).join("\n"), context);
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
    assert.match(record.name, /^Demo customer/);
    assert.match(record.email, /@example\.invalid$/);
    for (const key of ["socialSource", "paymentRoute", "paypalOrderId", "paypalCaptureId"]) assert.equal(record[key], undefined);
    ids.add(record.id);
  }
  assert.equal(ids.size, records.length);
  assert.deepEqual([...totals], [["2026-11-12", 59400], ["2026-11-13", 63800], ["2026-11-14", 68200]]);
  for (const total of totals.values()) assert.ok(total >= 55000 && total <= 70000);
});

test("demo switching labels every record, selects each sample day, and preserves the entire live calendar", () => {
  const { context, liveRecords } = demoContext();
  const originalCursor = context.socialCalendarCursor;
  context.setUnifiedPaymentView("demo");
  assert.equal(context.elements.socialPortal.hidden, true);
  assert.equal(context.elements.unifiedDemoPayments.hidden, false);
  assert.equal(context.elements.unifiedDemoButton.attributes["aria-pressed"], "true");
  const cards = context.elements.unifiedDemoDates.children;
  assert.deepEqual(cards.map((card) => card.children[1].textContent), ["$594 demo total", "$638 demo total", "$682 demo total"]);
  for (const [date, count] of [["2026-11-12", 21], ["2026-11-13", 22], ["2026-11-14", 23]]) {
    context.renderUnifiedDemoPayments(date);
    const rows = context.elements.unifiedDemoDetails.children.slice(1);
    assert.equal(rows.length, count);
    for (const row of rows) {
      assert.match(textOf(row), /Demo record — no payment made/);
      assert.match(textOf(row), /Demo amount/);
      assert.doesNotMatch(textOf(row), /IST IST/);
      assert.doesNotMatch(textOf(row), /Actual customer|AnshuPortal|Badal Portal|Rohit Portal|Alok Portal/);
    }
  }
  context.setUnifiedPaymentView("records");
  assert.equal(context.elements.socialPortal.hidden, false);
  assert.equal(context.elements.unifiedDemoPayments.hidden, true);
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
    context.setUnifiedPaymentView("demo");
    context.renderUnifiedDemoPayments();
    assert.equal(context.elements.unifiedPaymentViews.hidden, true);
    assert.equal(context.elements.unifiedDemoPayments.hidden, true);
    assert.equal(context.elements.socialPortal.hidden, false);
    assert.equal(context.elements.unifiedDemoDates.children.length, 0);
    assert.equal(context.elements.unifiedDemoDetails.children.length, 0);
  }
});
