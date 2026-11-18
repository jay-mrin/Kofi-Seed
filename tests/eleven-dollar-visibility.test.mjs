import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { URL } from "node:url";
import { policy } from "./helpers/social-policy.mjs";
import { createQuery, matchesFilter } from "./helpers/portal-query.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const extract = (text, name) => text.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];

test("amount eligibility uses exact positive integer cents in server and browser", () => {
  const browserRule = vm.runInNewContext(`${extract(read("src/app.js"), "isElevenDollarMultiple")}; isElevenDollarMultiple`);
  for (const [cents, eligible] of [[0, false], [-1100, false], [700, false], [1100, true], [1200, false], [1499, false], [1999, false], [2200, true], [2201, false], [3299, false], [3300, true], [4400, true], [1100.1, false], [NaN, false], [Infinity, false]]) {
    assert.equal(policy.isElevenDollarMultiple(cents), eligible, String(cents));
    assert.equal(browserRule(cents), eligible, String(cents));
  }
});

test("every non-multiple is exclusive across historical dates, providers and collecting accounts", () => {
  const source = extract(read("supabase/functions/admin-donations/index.ts"), "applyAdminDonationScope")
    .replace('query: any, role: "admin" | "super_admin"', "query, role");
  const scope = vm.runInNewContext(`${source}; applyAdminDonationScope`, policy);
  const dates = ["2026-11-14T12:00:00.000Z", "2026-11-16T18:29:59.999Z", "2026-11-16T18:30:00.000Z", "2026-11-18T00:00:00.000Z"];
  for (const amount of [7, 12, 14.99, 19.99, 21.99, 22.01, 32.99, 33.01, 54.99]) {
    for (const created_at of dates) for (const payment_method of ["paypal", "dodo"]) for (const payment_route of ["standard", "superadmin"]) {
      const row = { amount, created_at, payment_method, payment_route, visibility_scope: payment_route === "standard" ? "public" : "superadmin_private", social_source: "ayush", raw_payment: { recovery: { adminHistoryVisible: true } } };
      const snapshot = JSON.stringify(row);
      assert.equal(scope(createQuery([row]), "admin").filtered().length, 0);
      assert.equal(scope(createQuery([row]), "super_admin").filtered().length, 1);
      assert.equal(matchesFilter(row, `or(${policy.SOCIAL_ELIGIBLE_ORDER_FILTER})`), false);
      assert.equal(JSON.stringify(row), snapshot);
    }
  }
  for (const [created_at, included] of [[dates[1], [11, 22, 33, 44]], [dates[2], [11, 22]]]) {
    for (const amount of [11, 22, 33, 44, 55, 66, 121]) {
      const row = { amount, created_at, payment_method: "paypal", payment_route: "standard", visibility_scope: "public" };
      assert.equal(scope(createQuery([row]), "admin").filtered().length, included.includes(amount) ? 1 : 0);
      assert.equal(scope(createQuery([row]), "super_admin").filtered().length, included.includes(amount) ? 0 : 1);
    }
  }
});

test("public payments and linked comments exclude non-multiples without changing stored rows", async () => {
  const source = extract(read("supabase/functions/public-bootstrap/index.ts"), "loadPublicContent")
    .replace("supabase: ReturnType<typeof getSupabaseAdmin>", "supabase")
    .replaceAll("comment: Record<string, any>", "comment");
  const donations = [11, 22, 7, 12, 19.99, 14.99].map((amount) => ({ id: String(amount), display_name: `Customer ${amount}`, amount, paypal_status: "COMPLETED", payment_method: "paypal", payment_route: "standard", visibility_scope: "public", created_at: "2026-11-18T12:00:00Z", raw_payment: {} }));
  const comments = donations.map((donation) => ({ id: donation.id, display_name: donation.display_name, body: "Message", amount: donation.amount, created_at: donation.created_at, donations: donation }));
  comments.push({ id: "mismatched-comment", amount: 11, donations: donations[2], created_at: donations[0].created_at });
  comments.push({ id: "unknown-payment", amount: null, source: "payment", donations: null });
  comments.push({ id: "legacy-story", amount: null, source: "legacy", donations: null });
  const original = JSON.stringify({ donations, comments });
  const supabase = { from(table) {
    const query = createQuery(table === "donations" ? donations : comments);
    query.limit = () => query;
    query.then = (resolve, reject) => Promise.resolve({ data: query.filtered(), error: null }).then(resolve, reject);
    return query;
  } };
  const load = vm.runInNewContext(`${source}; loadPublicContent`, { ...policy, getIndiaDayStart: () => "2026-11-17T18:30:00Z" });
  const result = await load(supabase);
  assert.deepEqual(Array.from(result.donations, (row) => row.id), ["11", "22"]);
  assert.deepEqual(Array.from(result.seedComments, (row) => row.id), ["11", "22", "legacy-story"]);
  assert.equal(JSON.stringify({ donations, comments }), original);
});

test("Admin weekly payment details and counts cannot expose excluded child payments", () => {
  const source = read("supabase/functions/admin-subscriptions/index.ts");
  const functions = ["mapPayment", "mapMembership"].map((name) => extract(source, name)
    .replaceAll("value: Record<string, any>", "value")
    .replaceAll("payment: Record<string, any>", "payment")
    .replaceAll("last: string | null", "last")).join("\n");
  const map = vm.runInNewContext(`${functions}; mapMembership`, policy);
  const membership = { successful_payment_count: 5, last_successful_payment_at: "2026-11-18T12:00:00Z", membership_payments: [
    { id: "old33", amount: 33, status: "COMPLETED", paid_at: "2026-11-16T18:29:59.999Z" },
    { id: "new22", amount: 22, status: "COMPLETED", paid_at: "2026-11-16T18:30:00Z" },
    { id: "new33", amount: 33, status: "COMPLETED", paid_at: "2026-11-18T09:00:00Z" },
    { id: "fraction", amount: 14.99, status: "COMPLETED", paid_at: "2026-11-18T11:00:00Z" },
    { id: "whole", amount: 12, status: "COMPLETED", paid_at: "2026-11-18T12:00:00Z" },
  ] };
  const snapshot = JSON.stringify(membership);
  const admin = map(membership, false);
  assert.deepEqual(Array.from(admin.payments, (row) => row.id), ["old33", "new22"]);
  assert.equal(admin.successfulPaymentCount, 2);
  assert.equal(admin.lastSuccessfulPaymentAt, "2026-11-16T18:30:00Z");
  const superAdmin = map(membership, true);
  assert.equal(superAdmin.payments.length, 5);
  assert.equal(superAdmin.successfulPaymentCount, 5);
  assert.equal(JSON.stringify(membership), snapshot);
});

test("new database guards preserve historical rows and collecting accounts", () => {
  const sql = read("supabase/migrations/202611180001_eleven_dollar_payment_visibility.sql");
  assert.equal((sql.match(/mod\(new.amount, 11\) <> 0/g) || []).length, 2);
  assert.match(sql, /2026-11-16 18:30:00\+00/);
  assert.match(sql, /new.social_source is not distinct from old.social_source/);
  assert.doesNotMatch(sql, /\bupdate\s+public\.|\bdelete\s+from|\btruncate|new\.(?:amount|created_at|payment_route|visibility_scope)\s*:=/i);
});
