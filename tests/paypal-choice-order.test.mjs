import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "src/app.js"), "utf8");

function source(name) {
  const match = app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing ${name}`);
  return match[0];
}

async function renderChoices({ customEnabled, country = "US", frequency = "once", paypalEligible = true, cardEligible = true, paypalFails = false }) {
  const order = [];
  const rendered = [];
  const choice = (name) => ({ name, hidden: true });
  const ui = {
    cardButton: choice("custom"),
    paypalButton: choice("paypal"),
    paypalCardButton: choice("paypal-card"),
    paypalButtonContainer: { innerHTML: "" },
    paypalCardButtonContainer: { innerHTML: "" },
    inlinePaypalCheckout: {
      appendChild(node) {
        const index = order.indexOf(node.name);
        if (index !== -1) order.splice(index, 1);
        order.push(node.name);
      },
    },
  };
  const paypal = {
    FUNDING: { PAYPAL: "paypal", CARD: "card" },
    Buttons({ fundingSource }) {
      return {
        isEligible: () => fundingSource === "paypal" ? paypalEligible : cardEligible,
        async render(container) {
          rendered.push(fundingSource);
          if (fundingSource === "paypal" && paypalFails) throw new Error("PayPal render failed");
          container.innerHTML = "rendered";
        },
      };
    },
  };
  const context = vm.createContext({
    backendReady: true,
    pendingDonation: { amount: 11, frequency, paymentRoute: "standard" },
    getCheckoutUi: () => ui,
    clearPayPalButtons: () => {
      ui.paypalButtonContainer.innerHTML = "";
      ui.paypalCardButtonContainer.innerHTML = "";
    },
    setPaymentStatus: () => {},
    setPayPalCheckoutLoading: () => {},
    loadVisitorCountry: async () => {},
    isCustomCardCheckoutAvailable: () => customEnabled && country === "US",
    getCheckoutRoute: () => "standard",
    isBackendConfigured: () => true,
    loadBackendData: async () => {},
    getPayPalSdkNamespace: () => "test",
    isPayPalConfigured: () => true,
    resetAllPayPalSdks: () => {},
    resetPayPalSdk: () => {},
    loadPayPalSdk: async () => paypal,
    buildPayPalButtonOptions: (_paypal, fundingSource) => ({ fundingSource }),
    buildPayPalSubscriptionButtonOptions: (_paypal, fundingSource) => ({ fundingSource }),
    waitForRenderedPayPalButton: async () => {},
    console: { warn() {} },
  });
  vm.runInContext(`${source("orderPayPalPaymentChoices")}\n${source("renderFreshPayPalButtons")}`, context);
  await context.renderFreshPayPalButtons();
  return { ui, order, rendered };
}

test("US custom checkout shows custom, PayPal, then PayPal card; turning it off keeps both PayPal buttons", async () => {
  const enabled = await renderChoices({ customEnabled: true });
  assert.deepEqual(enabled.order, ["custom", "paypal", "paypal-card"]);
  assert.deepEqual(enabled.rendered, ["paypal", "card"]);
  assert.equal(enabled.ui.cardButton.hidden, false);
  assert.equal(enabled.ui.paypalButton.hidden, false);
  assert.equal(enabled.ui.paypalCardButton.hidden, false);

  for (const options of [{ customEnabled: false }, { customEnabled: true, country: "GB" }]) {
    const normal = await renderChoices(options);
    assert.deepEqual(normal.order, ["paypal", "paypal-card", "custom"]);
    assert.deepEqual(normal.rendered, ["paypal", "card"]);
    assert.equal(normal.ui.cardButton.hidden, true);
    assert.equal(normal.ui.paypalButton.hidden, false);
    assert.equal(normal.ui.paypalCardButton.hidden, false);
  }
});

test("an unavailable PayPal button does not hide an eligible card button", async () => {
  const cardOnly = await renderChoices({ customEnabled: false, paypalEligible: false });
  assert.equal(cardOnly.ui.paypalButton.hidden, true);
  assert.equal(cardOnly.ui.paypalCardButton.hidden, false);
  assert.equal(cardOnly.ui.cardButton.hidden, true);

  const failedPaypal = await renderChoices({ customEnabled: true, paypalFails: true });
  assert.equal(failedPaypal.ui.cardButton.hidden, false);
  assert.equal(failedPaypal.ui.paypalButton.hidden, true);
  assert.equal(failedPaypal.ui.paypalCardButton.hidden, false);
});

test("weekly checkout keeps both PayPal buttons and never shows the custom card", async () => {
  const weekly = await renderChoices({ customEnabled: true, frequency: "weekly" });
  assert.deepEqual(weekly.order, ["paypal", "paypal-card", "custom"]);
  assert.deepEqual(weekly.rendered, ["paypal", "card"]);
  assert.equal(weekly.ui.cardButton.hidden, true);
  assert.equal(weekly.ui.paypalButton.hidden, false);
  assert.equal(weekly.ui.paypalCardButton.hidden, false);
});

test("reopening the checkout preserves the custom card's used state", () => {
  const attributes = new Map([["aria-disabled", "true"], ["tabindex", "-1"]]);
  const ui = {
    cardButton: { classList: { contains: (name) => name === "is-disabled" } },
    alternateCardCheckoutLink: { attributes },
    inlinePaypalCheckout: { hidden: true },
    checkoutButton: { classList: { add() {} }, setAttribute() {} },
    emailInput: { focus() {} },
  };
  const context = vm.createContext({
    getCheckoutUi: () => ui,
    updateWeeklySeedOption: () => {},
    setPaymentStatus: () => {},
    elements: { paypalPaymentDialog: { showModal() {} }, paypalContinueButton: { hidden: true } },
  });
  vm.runInContext(source("openInlinePayPalCheckout"), context);
  context.openInlinePayPalCheckout();
  assert.equal(ui.cardButton.classList.contains("is-disabled"), true);
  assert.equal(attributes.get("aria-disabled"), "true");
  assert.equal(attributes.get("tabindex"), "-1");
});
