import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { setImmediate } from "node:timers/promises";
import { URL } from "node:url";

const source = readFileSync(new URL("../src/paypal-recovery.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

function setup({ loadFails = false, renderFails = false, storage = new Map(), details = {} } = {}) {
  const node = () => ({ hidden: false, disabled: false, textContent: "", children: [], replaceChildren() { this.children = []; } });
  const ui = Object.fromEntries(["host", "title", "description", "status", "loading", "amount", "paypal", "card", "reload"].map((key) => [key, node()]));
  const rendered = [], namespaces = [], closed = [], captures = [], creates = [], finished = [], resets = [];
  let captureError, finishError, captureWait, sdkWait;
  const context = vm.createContext({ window: { sessionStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  } } });
  vm.runInContext(source, context);
  let controller;
  const sdk = { FUNDING: { PAYPAL: "paypal", CARD: "card" }, Buttons(options) {
    rendered.push(options);
    return { isEligible: () => true, close() { closed.push(options); }, async render(container) {
      if (renderFails) { options.onError(new Error("Render error")); throw new Error("Render error"); }
      container.children.push("iframe");
    } };
  } };
  controller = context.window.createPayPalRecovery({
    ui,
    getDetails: () => ({ name: "Customer", email: "customer@example.invalid", amount: 55, paymentRoute: "superadmin", sourceTag: "rohit", ...details }),
    formatAmount: (amount) => `$${amount.toFixed(2)}`,
    loadSdk: async (_details, namespace) => {
      namespaces.push(namespace);
      if (sdkWait) await sdkWait;
      if (loadFails) throw new Error("SDK unavailable");
      return sdk;
    },
    resetSdk: (namespace) => resets.push(namespace),
    waitForButton: async () => {},
    createOrder: async (snapshot) => { creates.push(snapshot); return { id: `ORDER-${creates.length}` }; },
    captureOrder: async (orderId) => {
      captures.push(orderId);
      if (captureWait) await captureWait;
      if (captureError) throw captureError;
      return { donation: { id: "confirmed-order" } };
    },
    finish: async (payment) => { if (finishError) throw finishError; finished.push(payment); },
    onDeclined: () => {},
    onFailure: () => { void controller.show(); },
  });
  return { controller, ui, rendered, namespaces, closed, captures, creates, finished, resets, storage,
    setCaptureError(value) { captureError = value; }, setFinishError(value) { finishError = value; },
    setCaptureWait(value) { captureWait = value; }, setSdkWait(value) { sdkWait = value; },
    setLoadFails(value) { loadFails = value; },
  };
}

test("every canceled or failed retry renders a fresh SDK while preserving checkout details", async () => {
  const flow = setup();
  await flow.controller.show();
  const original = flow.rendered[0];
  assert.equal(await original.createOrder(), "ORDER-1");
  original.onCancel();
  await setImmediate();
  assert.equal(flow.namespaces.length, 2);
  assert.notEqual(flow.namespaces[0], flow.namespaces[1]);
  const current = flow.rendered.at(-2);
  assert.equal(await current.createOrder(), "ORDER-2");
  assert.equal(flow.creates[1].amount, 55);
  assert.equal(flow.creates[1].paymentRoute, "superadmin");
  assert.equal(flow.creates[1].sourceTag, "rohit");
  current.onError();
  await setImmediate();
  assert.equal(flow.namespaces.length, 3);
  assert.equal(flow.captures.length, 0);
  original.onCancel();
  await assert.rejects(original.createOrder(), /expired/);
  assert.equal(flow.namespaces.length, 3, "Stale callbacks cannot replace the active checkout");
});

test("SDK and render failures keep a usable reload button without an automatic reload loop", async () => {
  for (const options of [{ loadFails: true }, { renderFails: true }]) {
    const flow = setup(options);
    await flow.controller.show();
    assert.equal(flow.namespaces.length, 1);
    assert.equal(flow.ui.reload.disabled, false);
    assert.equal(flow.ui.loading.hidden, true);
    assert.match(flow.ui.status.textContent, /couldn't load/);
  }
  const flow = setup({ loadFails: true });
  await flow.controller.show();
  flow.setLoadFails(false);
  await flow.controller.retry();
  assert.equal(flow.namespaces.length, 2);
  assert.equal(flow.ui.paypal.children.length, 1);
});

test("an interrupted approval rechecks the same order and never creates a replacement payment", async () => {
  const flow = setup();
  flow.setCaptureError(Object.assign(new Error("Network failure"), { code: "NETWORK_ERROR" }));
  await flow.controller.approve("PAYPAL-ORDER");
  assert.equal(flow.controller.hasPendingApproval(), true);
  assert.match(flow.ui.title.textContent, /Checking/);
  assert.equal(flow.namespaces.length, 0);
  await flow.controller.retry();
  assert.deepEqual(flow.captures, ["PAYPAL-ORDER", "PAYPAL-ORDER"]);
  assert.equal(flow.creates.length, 0);
  flow.setCaptureError(null);
  await flow.controller.retry();
  assert.equal(flow.finished.length, 1);
  assert.equal(flow.controller.hasPendingApproval(), false);
  assert.equal(flow.storage.size, 0);
});

test("simultaneous callbacks and retries share one capture request", async () => {
  const flow = setup();
  let resolve;
  flow.setCaptureWait(new Promise((done) => { resolve = done; }));
  const first = flow.controller.approve("PAYPAL-ORDER");
  const retry = flow.controller.retry();
  const duplicate = flow.controller.approve("PAYPAL-ORDER");
  assert.equal(flow.captures.length, 1);
  resolve();
  await Promise.all([first, retry, duplicate]);
  assert.equal(flow.finished.length, 1);
  await flow.controller.approve("PAYPAL-ORDER");
  assert.equal(flow.captures.length, 1, "Late approval callbacks stop after confirmed success");
  assert.equal(flow.finished.length, 1);
});

test("a declined funding source can restart and approve again inside the restart callback", async () => {
  const flow = setup();
  flow.setCaptureError(Object.assign(new Error("Declined"), { code: "INSTRUMENT_DECLINED" }));
  await flow.controller.approve("PAYPAL-ORDER", { restart: async () => {
    assert.equal(flow.controller.hasPendingApproval(), false);
    flow.setCaptureError(null);
    await flow.controller.approve("PAYPAL-ORDER");
  } });
  assert.equal(flow.captures.length, 2);
  assert.equal(flow.finished.length, 1);
});

test("a definitive failed capture allows fresh checkout, while pending capture stays guarded", async () => {
  for (const error of [
    Object.assign(new Error("Denied"), { code: "PAYMENT_DENIED" }),
    Object.assign(new Error("Legacy denial"), { status: 500, details: 'PayPalApiError: PayPal capture failed: {"details":[{"issue":"PAYMENT_DENIED"}]}' }),
    Object.assign(new Error("Expired"), { status: 410 }),
  ]) {
    const flow = setup();
    flow.setCaptureError(error);
    await flow.controller.approve("PAYPAL-ORDER");
    await setImmediate();
    assert.equal(flow.controller.hasPendingApproval(), false);
    assert.equal(flow.namespaces.length, 1);
  }
  const flow = setup();
  flow.setCaptureError(Object.assign(new Error("Pending"), { status: 422, details: { purchase_units: [{ payments: { captures: [{ status: "PENDING" }] } }] } }));
  await flow.controller.approve("PAYPAL-ORDER");
  assert.equal(flow.controller.hasPendingApproval(), true);
  assert.equal(flow.namespaces.length, 0);
});

test("a UI failure after verified payment only retries confirmation presentation", async () => {
  const flow = setup();
  flow.setFinishError(new Error("Presentation failed"));
  await flow.controller.approve("PAYPAL-ORDER");
  assert.match(flow.ui.title.textContent, /Was Sown/);
  flow.setFinishError(null);
  await flow.controller.retry();
  assert.equal(flow.captures.length, 1);
  assert.equal(flow.finished.length, 1);
});

test("closing during SDK loading prevents stale buttons from rendering", async () => {
  const flow = setup();
  let resolve;
  flow.setSdkWait(new Promise((done) => { resolve = done; }));
  const loading = flow.controller.show();
  flow.controller.close();
  resolve();
  await loading;
  assert.equal(flow.rendered.length, 0);
  assert.equal(flow.resets.length, 1);
});

test("pending approvals survive a refresh without persisting customer contact information", async () => {
  const flow = setup();
  flow.setCaptureError(new Error("Unknown response"));
  await flow.controller.approve("PAYPAL-ORDER");
  const saved = [...flow.storage.values()].join("");
  assert.doesNotMatch(saved, /Customer|customer@example|sourceTag|rohit/);
  const restored = setup({ storage: flow.storage });
  assert.equal(restored.controller.hasPendingApproval(), true);
  await restored.controller.show();
  assert.equal(restored.namespaces.length, 0);
  await restored.controller.retry();
  assert.deepEqual(restored.captures, ["PAYPAL-ORDER"]);
  assert.equal(restored.finished.length, 1);
});

test("a confirmed payment shows its receipt without waiting for a public-content refresh", async () => {
  let resolveRefresh;
  let receiptShown = 0;
  const text = () => ({ textContent: "", hidden: false });
  const context = vm.createContext({
    pendingDonation: null,
    state: { donations: [], seedComments: [] },
    getRandomFortuneMessage: () => "A blessing",
    isBackendConfigured: () => true,
    loadBackendData: () => new Promise((resolve) => { resolveRefresh = resolve; }),
    renderApp() {},
    elements: { receiptKicker: text(), receiptTitle: text(), receiptSummary: text() },
    getCheckoutUi: () => ({ form: { reset() {} }, emailInput: { value: "customer@example.invalid" } }),
    setAmount() {}, getInitialDonationAmount: () => 11, updateCheckoutLabel() {},
    closeInlinePayPalCheckout() {}, closePaymentFailure() {},
    openReceipt() { receiptShown += 1; },
  });
  vm.runInContext(app.match(/async function finishVerifiedDonation\([^]*?\n\}/)[0], context);
  const finished = context.finishVerifiedDonation({ donation: { id: "verified" }, paymentRoute: "superadmin" });
  await setImmediate();
  assert.equal(receiptShown, 1);
  resolveRefresh();
  await finished;
  assert.equal(context.state.donations.length, 0, "SuperAdmin payments do not enter the public feed");
});
