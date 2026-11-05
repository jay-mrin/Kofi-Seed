import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "src/app.js"), "utf8");
const functionSource = (name) => {
  const match = app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing ${name}`);
  return match[0];
};

test("only Admin orders placed from 5 November 2026 in India use the new receipt", () => {
  const useReceipt = vm.runInNewContext(
    `const ADMIN_RECEIPT_START_ISO = "2026-11-04T18:30:00.000Z";
     ${functionSource("shouldUseSowseedWritingReceipt")}; shouldUseSowseedWritingReceipt`,
  );
  const older = { createdAt: "2026-11-04T18:29:59.999Z", digitalOrder: { fulfilledAt: "2026-11-06T12:00:00Z" } };
  const atCutoff = { createdAt: "2026-11-04T18:30:00.000Z" };
  assert.equal(useReceipt(older, "admin"), false);
  assert.equal(useReceipt(atCutoff, "admin"), true);
  assert.equal(useReceipt(atCutoff, "super_admin"), false);
  assert.equal(useReceipt({ createdAt: "" }, "admin"), false);
  const download = functionSource("downloadOrderProofPdf");
  assert.match(download, /shouldUseSowseedWritingReceipt\(donation, state\.adminProfile\?\.role\)[\s\S]*buildSowseedWritingOrderPdf\(donation\)[\s\S]*buildPremiumOrderPdf\(donation\)/);
});

test("new Admin receipt follows the supplied layout with actual order fields", () => {
  const names = [
    "normalizePdfText", "pdfEscape", "pdfRgb", "pdfText", "formatFixedAmount",
    "receiptTextLines", "receiptRule", "drawReceiptField", "drawReceiptContinuationPages",
    "buildSowseedWritingOrderPdf", "buildPdfDocument", "readableIndiaDateTime",
  ];
  const source = names.map(functionSource).join("\n");
  const order = {
    customerName: "Sample Customer", frequency: "One time", createdAt: "2026-11-05T00:39:00.000Z",
    orderNumber: "SYS-20261105-EXAMPLE", transactionId: "CAPTURE-EXAMPLE",
    contactEmail: "contact@example.invalid", payerEmail: "buyer@example.invalid",
    itemName: "Digital Book - The Garden Letters", amount: 199, currency: "USD",
    provider: "PayPal", paymentStatus: "COMPLETED", providerOrderId: "ORDER-EXAMPLE",
    fulfilledAt: "2026-11-05T00:40:00.000Z",
  };
  const context = {
    PDF_PAGE_WIDTH: 595.2756, PDF_PAGE_HEIGHT: 841.8898,
    FULFILLED_PDF_NOTE: "The personalised digital writing was completed and delivered electronically.",
    getProofPdfData: () => order,
    getDigitalOrderValue: (_donation, key, fallback) => key === "fulfillmentNote" ? "" : fallback,
  };
  const build = vm.runInNewContext(`${source}; buildSowseedWritingOrderPdf`, context);
  const pdf = build({});
  for (const text of [
    "SOWSEEDWRITING", "ORDER RECEIPT", "Thank you for your purchase.",
    "PURCHASED ITEM", "The Garden Letters", "Digital edition  |  One-time purchase",
    "ORDER INFORMATION", "PAYMENT DETAILS", "FULFILLMENT NOTE",
    "Sample Customer", "05/11/2026 06:09 IST", "$199.00 USD",
    "SYS-20261105-EXAMPLE", "CAPTURE-EXAMPLE", "contact@example.invalid",
    "buyer@example.invalid", "ORDER-EXAMPLE", "Merchant-issued order receipt",
  ]) assert.ok(pdf.includes(`(${text})`), `Missing receipt text: ${text}`);
  assert.match(pdf, /\/Count 1 >>/);
  assert.doesNotMatch(pdf, /SEED GARDEN RIGHTS|Lilamani/);

  context.getDigitalOrderValue = (_donation, key, fallback) =>
    key === "fulfillmentNote" ? "A".repeat(400) : fallback;
  const longPdf = build({});
  assert.match(longPdf, /\/Count 2 >>/);
  assert.match(longPdf, /ORDER DETAILS CONTINUED/);
  assert.match(longPdf, /AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/);
});
