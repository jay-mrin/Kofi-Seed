import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("public ranking board exposes only completed Admin-routed names and amounts", () => {
  const endpoint = read("../supabase/functions/public-transactions/index.ts");
  const html = read("../index.html");
  const app = read("../src/app.js");

  assert.match(endpoint, /request\.method !== "GET"/);
  assert.match(endpoint, /\.eq\("paypal_status", "COMPLETED"\)/);
  assert.match(endpoint, /\.eq\("payment_route", "standard"\)/);
  assert.match(endpoint, /\.eq\("visibility_scope", "public"\)/);
  assert.match(endpoint, /\.in\("payment_method", \["paypal", "dodo"\]\)/);
  assert.match(endpoint, /row\.raw_payment\?\.mode !== "test"/);
  assert.match(endpoint, /\.map\(\(row\) => \(\{ name: row\.display_name, amount: Number\(row\.amount\) \}\)\)/);
  assert.match(html, /class="transaction-board"[\s\S]*id="transactionBoardList"/);
  assert.doesNotMatch(html, /Sow Your Seed for<br \/>Your Love &amp; Soulmate|Sow a seed <span/);
  assert.match(app, /public-transactions\?offset=\$\{transactionBoardOffset\}/);
});
