import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { URL, URLSearchParams } from "node:url";
import { setImmediate } from "node:timers";
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const dodo = readFileSync(new URL("../src/home-dodo-checkout.js", import.meta.url), "utf8");
const source = (name) => app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];
function field(value = "") {
  const listeners = {};
  return { value, textContent: "", dataset: {}, hidden: false, disabled: false, listeners,
    classList: { toggle() {} }, setAttribute() {}, removeAttribute() {}, focus() {},
    addEventListener: (event, listener) => { listeners[event] = listener; },
    checkValidity() { return /^\d+(\.\d{1,2})?$/.test(this.value) && Number(this.value) >= Number(this.min || 11); },
    reportValidity() { return this.checkValidity(); } };
}

test("editing the PayPal total preserves typed cents, updates seeds, and submits the exact amount", () => {
  const amountInput = field("11.00");
  const elements = { amountInput, amountError: field(), nameInput: field("Customer"), nameError: field(), messageInput: field(),
    checkoutLabel: field(), checkoutButton: field(), seedPriceLabel: field(), seedQuantityNoun: field(),
    paypalTotalAmount: { innerHTML: "input-control" }, paypalTotalSeeds: field(),
    supportForm: { querySelectorAll: () => [] } };
  const context = vm.createContext({ elements, MIN_DONATION_AMOUNT: 11, SEED_DOLLAR_VALUE: 11,
    state: { settings: { seedPrice: 11 } }, getCheckoutRoute: () => Number(amountInput.value) >= 33 ? "superadmin" : "standard",
    getPayPalRecovery: () => ({ hasPendingApproval: () => false, begin() {} }), getPaymentEmail: () => "customer@example.invalid",
    trackCheckoutEvent() {}, closeInlinePayPalCheckout() {}, openInlinePayPalCheckout() {}, money: (value) => `$${value}` });
  const listeners = app.slice(app.indexOf('elements.amountInput.addEventListener("input"'), app.indexOf('elements.decreaseSeedButton?.addEventListener("click"'));
  vm.runInContext(`let pendingDonation = null; ${["getAmount", "getSeedUnitsFromAmount", "formatSeedUnits", "updateCheckoutLabel", "validateForm", "submitDonation", "setAmount"].map(source).join("\n")} ${listeners}; function currentOrder() { return pendingDonation; }`, context);
  amountInput.value = "15.25";
  amountInput.listeners.input();
  assert.equal(amountInput.value, "15.25");
  assert.equal(elements.paypalTotalAmount.innerHTML, "input-control");
  context.submitDonation({ preventDefault() {} });
  assert.equal(context.currentOrder().amount, 15.25);
  assert.equal(context.currentOrder().paymentRoute, "standard");
  amountInput.value = "33";
  amountInput.listeners.input(); amountInput.listeners.blur();
  assert.equal(amountInput.value, "33.00");
  assert.equal(elements.paypalTotalSeeds.textContent, "(3 Seeds)");
  context.submitDonation({ preventDefault() {} });
  assert.equal(context.currentOrder().paymentRoute, "superadmin");
  context.setAmount(22);
  assert.equal(amountInput.value, "22.00");
  for (const invalid of ["", "5", "11.001"]) {
    amountInput.value = invalid;
    context.submitDonation({ preventDefault() {} });
    assert.equal(context.currentOrder(), null);
    assert.match(elements.amountError.textContent, /at least \$11/);
  }
});

test("Dodo amount editing reaches checkout exactly and quantity buttons reset the amount", async () => {
  const ids = ["dodoCheckoutForm", "dodoSeedCount", "dodoTotalAmount", "dodoAmountInput", "dodoTotalSeeds", "dodoCheckoutButton", "dodoPayButton", "dodoDirectButton", "dodoPaymentDialog", "closeDodoPaymentDialog", "dodoPaymentPanel", "dodoCheckoutLoader", "dodoCheckoutLoaderText", "dodoPaymentStatus", "dodoCustomerEmail", "dodoCustomerName", "dodoCustomerMessage", "dodoDecreaseSeeds", "dodoIncreaseSeeds"];
  const nodes = Object.fromEntries(ids.map((id) => [id, field()]));
  nodes.dodoTotalAmount.dataset.unitPrice = "11";
  nodes.dodoCheckoutForm.querySelectorAll = () => [];
  nodes.dodoCustomerName.value = "Customer"; nodes.dodoCustomerName.reportValidity = () => true;
  nodes.dodoCustomerEmail.value = "customer@example.invalid"; nodes.dodoCustomerEmail.reportValidity = () => true;
  const calls = [];
  const document = { querySelector: (selector) => nodes[selector.slice(1)], readyState: "loading", addEventListener() {} };
  const context = vm.createContext({ document, URL, URLSearchParams, Intl, console: { warn() {} },
    crypto: { randomUUID: () => "01234567-89ab-cdef-0123-456789abcdef" }, MutationObserver: class { observe() {} },
    window: { location: { assign() {} }, sessionStorage: { setItem() {}, removeItem() {} }, SowYourSeedCheckout: {
      callEdge: async (_endpoint, options) => { calls.push(options.body); return { checkoutUrl: "https://checkout.example.invalid/" }; } } } });
  vm.runInContext(dodo, context);
  const input = nodes.dodoAmountInput;
  input.value = "15.25"; input.listeners.input();
  nodes.dodoIncreaseSeeds.listeners.click();
  assert.equal(input.value, "22.00");
  nodes.dodoDecreaseSeeds.listeners.click();
  assert.equal(input.value, "11.00");
  input.value = "15.25"; input.listeners.input();
  assert.equal(input.value, "15.25");
  assert.equal(nodes.dodoSeedCount.value, "1");
  await nodes.dodoPayButton.listeners.click();
  // click uses a fire-and-forget handler; complete its mocked checkout.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls[0].amount, 15.25);
  assert.equal(calls[0].seedCount, 1);
});
