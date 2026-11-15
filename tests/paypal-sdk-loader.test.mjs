import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { URL, URLSearchParams } from "node:url";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const helper = (name) => app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];

function loader() {
  const scripts = [];
  const window = { setTimeout: () => 1, clearTimeout() {} };
  const context = vm.createContext({
    window, URLSearchParams,
    CONFIG: { currency: "USD" }, paymentConfig: { currency: "USD" },
    elements: { weeklySeedToggle: { checked: false }, amountInput: { value: "11" } },
    PAYPAL_SDK_LOAD_TIMEOUT_MS: 20000,
    paypalSdkPromises: new Map(), paypalSdkKeysByNamespace: new Map(),
    getPayPalClientId: () => "current-client", getCheckoutRoute: () => "standard",
    getPayPalSdkNamespace: () => "paypalTest",
    isValidPayPalSdk: (value) => Boolean(value?.Buttons),
    waitForPayPalSdk: (namespace) => Promise.resolve(window[namespace]),
    document: {
      querySelectorAll: (selector) => scripts.filter((script) => !script.removed && selector.includes(`"${script.namespace}"`)),
      createElement: () => ({ dataset: {}, setAttribute(key, value) { if (key === "data-namespace") this.namespace = value; }, remove() { this.removed = true; } }),
      head: { append(script) { scripts.push(script); } },
    },
  });
  vm.runInContext(`${helper("resetPayPalSdk")}\n${helper("loadPayPalSdk")}`, context);
  return { context, scripts, window };
}

test("a late failed SDK request cannot destroy the newer checkout namespace", async () => {
  const flow = loader();
  const first = flow.context.loadPayPalSdk();
  const firstRejected = assert.rejects(first, /could not load/);
  flow.context.resetPayPalSdk("paypalTest");
  const second = flow.context.loadPayPalSdk();
  const sdk = { Buttons() {} };
  flow.window.paypalTest = sdk;
  flow.scripts[1].onload();
  assert.equal(await second, sdk);
  flow.scripts[0].onerror();
  await firstRejected;
  assert.equal(flow.window.paypalTest, sdk);
  assert.equal(flow.scripts[1].removed, undefined);
  assert.equal(await flow.context.loadPayPalSdk(), sdk);
});

test("retry SDKs use independent namespaces and the pinned merchant client", async () => {
  const flow = loader();
  const pending = flow.context.loadPayPalSdk(false, 55, {
    namespace: "paypalRecovery2", clientId: "pinned-superadmin-client", paymentRoute: "superadmin",
  });
  const url = new URL(flow.scripts[0].src);
  assert.equal(url.origin, "https://www.paypal.com");
  assert.equal(url.searchParams.get("client-id"), "pinned-superadmin-client");
  assert.equal(url.searchParams.get("intent"), "capture");
  assert.equal(flow.scripts[0].namespace, "paypalRecovery2");
  const sdk = { Buttons() {} };
  flow.window.paypalRecovery2 = sdk;
  flow.scripts[0].onload();
  assert.equal(await pending, sdk);
});
