import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

test("standard transactions are authenticated and expose only successful names, amounts, and dates", () => {
  const source = readFileSync(new URL("../supabase/functions/standard-transactions/index.ts", import.meta.url), "utf8");
  assert.match(source, /requireAdmin\(request, \{ allowedRoles: \["standard"\] \}\)/);
  assert.match(source, /request\.method !== "GET"/);
  assert.match(source, /\.select\("display_name, amount, created_at"\)/);
  assert.match(source, /\.eq\("paypal_status", "COMPLETED"\)/);
  assert.match(source, /return jsonResponse\(\{ transactions \}\)/);
  assert.doesNotMatch(source, /raw_payment|payer_email|supporter_message|digital_orders/);
});

test("standard sign in loads only the limited calendar", () => {
  const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /if \(state\.adminProfile\?\.role === "standard"\) \{\s*await loadStandardTransactions\(\);\s*\} else \{/);
  assert.match(source, /elements\.adminForm\.hidden = isStandard/);
  assert.match(source, /const shouldShow = isStandard \? false/);
});
