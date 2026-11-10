import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(path.join(root, "supabase/functions/admin-analytics/index.ts"), "utf8");
const helper = source.match(/function getPaymentFailureReason\([^]*?\n\}/)[0].replace("attempt: any", "attempt");
const failureReason = vm.runInNewContext(`${helper}; getPaymentFailureReason`);

test("failure diagnostics recover technical codes from older saved responses", () => {
  assert.equal(failureReason({ status: "started", capture_error_issue: "INSTRUMENT_DECLINED" }), "INSTRUMENT_DECLINED");
  assert.equal(failureReason({ status: "failed", capture_webhook_reason: "RECEIVING_LIMIT_EXCEEDED" }), "RECEIVING_LIMIT_EXCEEDED");
  assert.equal(failureReason({ status: "started", capture_webhook_status: "denied" }), "PAYMENT_CAPTURE_DENIED");
  assert.equal(failureReason({ status: "failed", capture_error_name: "UNPROCESSABLE_ENTITY" }), "UNPROCESSABLE_ENTITY");
  assert.equal(failureReason({ status: "failed", failure_reason: "CARD_EXPIRED", capture_error_issue: "INSTRUMENT_DECLINED" }), "CARD_EXPIRED");
});

test("unknown reasons stay unknown and completed or unfinished payments are not called failures", () => {
  assert.equal(failureReason({ status: "confirmed", failure_reason: "INSTRUMENT_DECLINED" }), null);
  assert.equal(failureReason({ status: "started" }), null);
  assert.equal(failureReason({ status: "started", capture_webhook_status: "PENDING" }), null);
  assert.equal(failureReason({ status: "failed" }), "NO_PROVIDER_REASON_RECORDED");
  assert.equal(failureReason({ status: "failed", capture_error_issue: "Unrelated private customer text" }), "NO_PROVIDER_REASON_RECORDED");
});

async function readAnalytics(role) {
  const selections = [];
  let handler;
  const supabase = {
    from(table) {
      let route;
      const query = {
        select(fields) { selections.push({ table, fields }); return query; },
        eq(key, value) { if (key === "payment_route") route = value; return query; },
        in() { return query; },
        gte() { return query; },
        order() { return query; },
        limit() { return query; },
        async maybeSingle() { return { data: { reset_at: "1970-01-01T00:00:00.000Z" }, error: null }; },
        then(resolve, reject) {
          const data = table === "payment_attempts" ? [{
            id: "attempt", display_name: "Customer", contact_email: "customer@example.invalid", amount: 11,
            currency: "USD", status: "failed", payment_route: route,
            capture_error_issue: "INSTRUMENT_DECLINED", failure_reason: null,
            raw_payment: { privateUnrelatedDetails: "never expose this stored response" },
            created_at: "2026-11-10T00:00:00.000Z", confirmed_at: null,
          }] : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const script = source.replace(/^import .*;\n/gm, "")
    .replace(/^type PaymentRoute.*;\n/m, "")
    .replace(/: (?:PaymentRoute|string|any)\b/g, "");
  vm.runInNewContext(script, {
    Deno: { serve(callback) { handler = callback; } },
    withCors: (callback) => callback,
    handleOptions: () => null,
    requireAdmin: async () => ({ supabase, adminProfile: { role } }),
    jsonResponse: (body) => ({ status: 200, body }),
    errorResponse: (error, status) => ({ status, error }),
    URL, Response: globalThis.Response,
  });
  return {
    response: await handler(new globalThis.Request("https://diagnostic.invalid/admin-analytics")),
    fields: selections.find((selection) => selection.table === "payment_attempts").fields,
  };
}

test("stored PayPal diagnostic fields are read and returned only for SuperAdmin", async () => {
  const superAdmin = await readAnalytics("super_admin");
  assert.equal(superAdmin.response.status, 200);
  assert.match(superAdmin.fields, /capture_error_issue:raw_payment->lastCaptureError->details->0->>issue/);
  assert.equal(superAdmin.response.body.paymentAttempts[0].failureReason, "INSTRUMENT_DECLINED");
  assert.doesNotMatch(JSON.stringify(superAdmin.response.body), /raw_payment|privateUnrelatedDetails|never expose/);

  const admin = await readAnalytics("admin");
  assert.equal(admin.response.status, 200);
  assert.doesNotMatch(admin.fields, /failure_reason|raw_payment|capture_error|capture_webhook/);
  assert.equal(Object.hasOwn(admin.response.body.paymentAttempts[0], "failureReason"), false);
});
