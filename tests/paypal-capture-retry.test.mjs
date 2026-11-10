import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "src/app.js"), "utf8");

function checkout(kind) {
  const result = { restarts: 0, closes: 0, failures: 0, completed: [], messages: [] };
  let captureError;
  const payload = { donation: { id: "verified-order" }, paymentRoute: "superadmin" };
  const status = {
    textContent: "",
    classList: { add() {} },
  };
  const context = vm.createContext({
    status,
    document: { querySelector: () => ({ close() { result.closes += 1; } }) },
    callEdge: async (name, options) => {
      assert.equal(name, "capture-paypal-order");
      assert.equal(options.body.orderId, "PAYPAL-ORDER");
      if (captureError) throw captureError;
      return payload;
    },
    finishVerifiedDonation: async (value) => { result.completed.push(value); },
    setPaymentStatus: (message) => { result.messages.push(message); },
    closeInlinePayPalCheckout: () => { result.closes += 1; },
    openPaymentFailure: () => { result.failures += 1; },
  });
  let approve;
  if (kind === "seed") {
    const source = app.match(/function buildPayPalButtonOptions\([^]*?\n\}/)?.[0];
    assert.ok(source);
    approve = vm.runInContext(`${source}; buildPayPalButtonOptions({ FUNDING: { PAYPAL: "paypal" } }, "paypal").onApprove`, context);
  } else {
    const ritual = app.slice(app.indexOf('document.querySelector("#ritualContinueButton")?.addEventListener'));
    const source = ritual.match(/onApprove: (async \(data, actions\) => \{[\s\S]*?\n        \}),\n        onCancel:/)?.[1];
    assert.ok(source);
    approve = vm.runInContext(`(${source})`, context);
  }
  return {
    result, payload, status,
    setError(error) { captureError = error; },
    approve: (actions = { restart: async () => { result.restarts += 1; } }) => approve({ orderID: "PAYPAL-ORDER" }, actions),
  };
}

for (const kind of ["seed", "ritual"]) {
  test(`${kind} retries a declined funding method without closing checkout or reporting success`, async () => {
    const flow = checkout(kind);
    flow.setError(Object.assign(new Error("Funding declined"), { code: "INSTRUMENT_DECLINED" }));
    await flow.approve();
    assert.equal(flow.result.restarts, 1);
    assert.equal(flow.result.closes, 0);
    assert.equal(flow.result.failures, 0);
    assert.equal(flow.result.completed.length, 0);

    flow.setError(null);
    await flow.approve();
    assert.equal(flow.result.completed.length, 1);
    assert.equal(flow.result.completed[0], flow.payload);
    assert.equal(flow.result.restarts, 1);
  });

  test(`${kind} keeps decline guidance visible if the SDK supplies no restart action`, async () => {
    const flow = checkout(kind);
    flow.setError(Object.assign(new Error("Funding declined"), { code: "INSTRUMENT_DECLINED" }));
    await flow.approve({});
    assert.equal(flow.result.closes, 0);
    assert.equal(flow.result.completed.length, 0);
    const message = kind === "seed" ? flow.result.messages.at(-1) : flow.status.textContent;
    assert.match(message, /choose another PayPal payment method/);
  });

  test(`${kind} does not restart a nonrecoverable capture failure`, async () => {
    const flow = checkout(kind);
    const error = Object.assign(new Error("PayPal could not confirm payment"), { code: "PAYMENT_DENIED" });
    flow.setError(error);
    if (kind === "seed") await assert.rejects(flow.approve(), (actual) => actual === error);
    else {
      await flow.approve();
      assert.equal(flow.status.textContent, error.message);
    }
    assert.equal(flow.result.restarts, 0);
    assert.equal(flow.result.completed.length, 0);
  });
}
