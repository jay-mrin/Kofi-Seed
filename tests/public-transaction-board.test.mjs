import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("public ranking board exposes only completed Admin-routed names and seed counts", () => {
  const endpoint = read("../supabase/functions/public-transactions/index.ts");
  const html = read("../index.html");
  const app = read("../src/app.js");
  const styles = read("../src/styles.css");

  assert.match(endpoint, /request\.method !== "GET"/);
  assert.match(endpoint, /\.eq\("paypal_status", "COMPLETED"\)/);
  assert.match(endpoint, /\.eq\("payment_route", "standard"\)/);
  assert.match(endpoint, /\.eq\("visibility_scope", "public"\)/);
  assert.match(endpoint, /\.in\("payment_method", \["paypal", "dodo"\]\)/);
  assert.match(endpoint, /row\.raw_payment\?\.mode !== "test"/);
  assert.match(endpoint, /\.select\("id, display_name, seed_count, raw_payment"\)/);
  assert.match(endpoint, /String\(row\.display_name \|\| "Customer"\)\.trim\(\)\.split\(\/\\s\+\/u\)\[0\]/);
  assert.match(endpoint, /seedCount: Number\(row\.seed_count\)/);
  assert.match(html, /class="transaction-board"[\s\S]*id="transactionBoardList"/);
  assert.doesNotMatch(html, /Admin payments only|Recent Transactions|Sow Your Seed for<br \/>Your Love &amp; Soulmate|Sow a seed <span/);
  assert.match(app, /public-transactions\?offset=\$\{transactionBoardOffset\}/);
  assert.match(app, /transactionBoardCount <= 3 \? `#\$\{transactionBoardCount\}` : ""/);
  assert.match(app, /name\.textContent = String\(transaction\.name \|\| "Customer"\)\.trim\(\)\.split\(\/\\s\+\/u\)\[0\]/);
  assert.match(app, /seeds\.textContent = `\$\{seedCount\} 🌱`/);
  assert.match(styles, /\.transaction-board \{[\s\S]*?border: 0;/);
  assert.match(styles, /\.transaction-board-item \{[\s\S]*?border-bottom: 0;/);
});
