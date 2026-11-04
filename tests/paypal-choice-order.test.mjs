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
  const rendered = [];
  let bootstrapLoads = 0;
  let sdkLoads = 0;
  const choice = (name) => ({ name, hidden: true });
  const ui = {
    cardButton: choice("custom"),
    paypalButton: choice("paypal"),
    paypalCardButton: choice("paypal-card"),
    paypalButtonContainer: { innerHTML: "" },
    paypalCardButtonContainer: { innerHTML: "" },
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
    pendingDonation: { amount: 11, frequency, paymentRoute: customEnabled ? "superadmin" : "standard" },
    elements: { weeklySeedToggle: { checked: frequency === "weekly" } },
    getCheckoutUi: () => ui,
    clearPayPalButtons: () => {
      ui.paypalButtonContainer.innerHTML = "";
      ui.paypalCardButtonContainer.innerHTML = "";
    },
    setPaymentStatus: () => {},
    setPayPalCheckoutLoading: () => {},
    updateWeeklySeedOption: () => {},
    loadVisitorCountry: async () => {},
    isCustomCardCheckoutAvailable: () => customEnabled && country === "US",
    getCheckoutRoute: () => customEnabled ? "superadmin" : "standard",
    isBackendConfigured: () => true,
    loadBackendData: async () => { bootstrapLoads += 1; },
    getPayPalSdkNamespace: () => "test",
    isPayPalConfigured: () => true,
    resetAllPayPalSdks: () => {},
    resetPayPalSdk: () => {},
    loadPayPalSdk: async () => { sdkLoads += 1; return paypal; },
    buildPayPalButtonOptions: (_paypal, fundingSource) => ({ fundingSource }),
    buildPayPalSubscriptionButtonOptions: (_paypal, fundingSource) => ({ fundingSource }),
    waitForRenderedPayPalButton: async () => {},
    console: { warn() {} },
  });
  vm.runInContext(source("renderFreshPayPalButtons"), context);
  await context.renderFreshPayPalButtons();
  return { ui, rendered, bootstrapLoads, sdkLoads, pendingDonation: context.pendingDonation, weeklyChecked: context.elements.weeklySeedToggle.checked };
}

test("US custom checkout shows only the custom card and does not start PayPal", async () => {
  const enabled = await renderChoices({ customEnabled: true });
  assert.deepEqual(enabled.rendered, []);
  assert.equal(enabled.bootstrapLoads, 0);
  assert.equal(enabled.sdkLoads, 0);
  assert.equal(enabled.ui.cardButton.hidden, false);
  assert.equal(enabled.ui.paypalButton.hidden, true);
  assert.equal(enabled.ui.paypalCardButton.hidden, true);

  for (const options of [{ customEnabled: false }, { customEnabled: true, country: "GB" }]) {
    const normal = await renderChoices(options);
    assert.deepEqual(normal.rendered, ["paypal", "card"]);
    assert.equal(normal.ui.cardButton.hidden, true);
    assert.equal(normal.ui.paypalButton.hidden, false);
    assert.equal(normal.ui.paypalCardButton.hidden, false);
    assert.equal(normal.sdkLoads, 1);
    assert.equal(normal.pendingDonation.paymentRoute, options.customEnabled ? "superadmin" : "standard");
  }
});

test("an unavailable PayPal button does not hide an eligible card button", async () => {
  const cardOnly = await renderChoices({ customEnabled: false, paypalEligible: false });
  assert.equal(cardOnly.ui.paypalButton.hidden, true);
  assert.equal(cardOnly.ui.paypalCardButton.hidden, false);
  assert.equal(cardOnly.ui.cardButton.hidden, true);

  const failedPaypal = await renderChoices({ customEnabled: true, country: "GB", paypalFails: true });
  assert.equal(failedPaypal.ui.cardButton.hidden, true);
  assert.equal(failedPaypal.ui.paypalButton.hidden, true);
  assert.equal(failedPaypal.ui.paypalCardButton.hidden, false);
});

test("US custom checkout cancels weekly selection while other countries keep PayPal subscriptions", async () => {
  const us = await renderChoices({ customEnabled: true, frequency: "weekly" });
  assert.deepEqual(us.rendered, []);
  assert.equal(us.pendingDonation.frequency, "once");
  assert.equal(us.weeklyChecked, false);
  assert.equal(us.ui.cardButton.hidden, false);

  const otherCountry = await renderChoices({ customEnabled: true, country: "GB", frequency: "weekly" });
  assert.deepEqual(otherCountry.rendered, ["paypal", "card"]);
  assert.equal(otherCountry.pendingDonation.frequency, "weekly");
  assert.equal(otherCountry.ui.cardButton.hidden, true);
  assert.equal(otherCountry.ui.paypalButton.hidden, false);
  assert.equal(otherCountry.ui.paypalCardButton.hidden, false);
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
