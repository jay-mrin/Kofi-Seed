import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const handler = createRequire(import.meta.url)(path.join(root, "api/visitor-country.js"));
const app = readFileSync(path.join(root, "src/app.js"), "utf8");
const source = (name) => {
  const match = app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing ${name}`);
  return match[0];
};

test("country endpoint uses the deployment header and prevents shared caching", () => {
  for (const [header, expected] of [["US", "US"], ["IN", "IN"], ["GB", "GB"], [undefined, ""], ["", ""], ["unknown", ""], [["US", "IN"], ""]]) {
    const response = {
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      status(code) { this.code = code; return this; },
      json(payload) { this.payload = payload; return this; },
    };
    handler({ method: "GET", headers: { "x-vercel-ip-country": header }, query: { country: "US" } }, response);
    assert.equal(response.code, 200);
    assert.deepEqual(response.payload, { country: expected });
    assert.match(response.headers["Cache-Control"], /private, no-store/);
    assert.equal(response.headers["Vercel-CDN-Cache-Control"], "no-store");
  }
});

test("custom card requires both the enabled setting and a detected US country", () => {
  const context = vm.createContext({ state: { settings: { alternateCardCheckoutVisible: false } } });
  vm.runInContext(`let visitorCountry = ""; ${source("isCustomCardCheckoutAvailable")}`, context);
  for (const enabled of [true, false]) {
    for (const country of ["US", "IN", "CA", "GB", "", "XX"]) {
      context.state.settings.alternateCardCheckoutVisible = enabled;
      vm.runInContext(`visitorCountry = ${JSON.stringify(country)}`, context);
      assert.equal(context.isCustomCardCheckoutAvailable(), enabled && country === "US");
    }
  }
  assert.match(app, /let cardFirst = !weekly && isCustomCardCheckoutAvailable\(\)/);
  assert.match(source("openAlternateCheckout"), /if \(!isCustomCardCheckoutAvailable\(\)/);
  assert.match(app, /if \(!isCustomCardCheckoutAvailable\(\)\) return;/);
});

test("country lookup failures and unexpected responses fall back to normal PayPal", async () => {
  for (const result of ["US", "IN", "invalid", null, new Error("Offline")]) {
    let fetchCount = 0;
    const context = vm.createContext({
      state: { settings: { alternateCardCheckoutVisible: true } },
      window: {
        AbortController: class { signal = {}; abort() {} },
        setTimeout: () => 1,
        clearTimeout: () => {},
      },
      fetch: async () => {
        fetchCount += 1;
        if (result instanceof Error) throw result;
        return { ok: result !== null, json: async () => ({ country: result }) };
      },
    });
    vm.runInContext(`let visitorCountry = ""; let visitorCountryPromise = null;
      ${source("isCustomCardCheckoutAvailable")}
      ${source("loadVisitorCountry")}`, context);
    assert.equal(context.isCustomCardCheckoutAvailable(), false);
    await context.loadVisitorCountry();
    await context.loadVisitorCountry();
    assert.equal(fetchCount, 1);
    assert.equal(context.isCustomCardCheckoutAvailable(), result === "US");
  }
});
