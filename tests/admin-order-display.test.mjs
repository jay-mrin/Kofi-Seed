import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const functionSource = (source, name) => {
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing ${name}`);
  return match[0];
};

test("older order notes remain stored when fulfillment status changes", () => {
  const app = read("src/app.js");
  const endpoint = read("supabase/functions/admin-donations/index.ts");
  const source = functionSource(endpoint, "buildFulfillmentUpdate")
    .replace(/function buildFulfillmentUpdate\([^]*?\) \{/, "function buildFulfillmentUpdate(body, fulfillmentStatus, requestedFulfilledAt) {");
  const buildUpdate = vm.runInNewContext(`${source}; buildFulfillmentUpdate`);
  const olderOrder = { fulfillment_note: "Original delivery notes" };
  const fulfilled = buildUpdate(
    { donationId: "older-order" }, "fulfilled", "2026-11-01T09:00:00.000Z",
  );
  assert.equal(Object.hasOwn(fulfilled, "fulfillment_note"), false);
  assert.equal({ ...olderOrder, ...fulfilled }.fulfillment_note, "Original delivery notes");
  const reopened = buildUpdate({ donationId: "older-order" }, "paid_awaiting_personalized_writing", "");
  assert.equal(Object.hasOwn(reopened, "fulfillment_note"), false);
  assert.equal({ ...olderOrder, ...reopened }.fulfillment_note, "Original delivery notes");
  assert.equal(buildUpdate({ fulfillmentNote: "Changed intentionally" }, "fulfilled", "2026-11-01T09:00:00Z").fulfillment_note, "Changed intentionally");
  assert.doesNotMatch(functionSource(app, "saveDigitalOrderFulfillment"), /fulfillmentNote:/);
});

test("Admin order cards show the book in Item and use Unfulfilled for pending orders", () => {
  const app = read("src/app.js");
  const status = vm.runInNewContext(`${functionSource(app, "getFulfillmentStatusLabel")}; getFulfillmentStatusLabel`);
  const item = vm.runInNewContext(
    `const DIGITAL_ORDER_ITEM_NAME = "Personalised Digital Writing - Custom Order Made Writing";
     ${functionSource(app, "getAdminOrderItemLabel")}; getAdminOrderItemLabel`,
  );
  assert.equal(status("paid_awaiting_personalized_writing", "Seed"), "Unfulfilled");
  assert.equal(status("paid_awaiting_personalized_writing", "Digital Book - Midnight Radio Diaries"), "Unfulfilled");
  assert.equal(status("fulfilled", "Seed"), "Fulfilled");
  assert.equal(item("Personalised Digital Writing - Custom Order Made Writing", "Midnight Radio Diaries", true), "Midnight Radio Diaries[Seed]");
  assert.equal(item("Personalised Digital Writing - Custom Order Made Writing", "", true), "Seed");
  assert.equal(item("Digital Book - Other", "", false), "Digital Book - Other");
  const detail = functionSource(app, "renderCalendarDetails");
  assert.doesNotMatch(detail, /Reedemed|data-fulfillment-note|admin-fulfillment-field/);
  assert.match(detail, /getAdminOrderItemLabel\(itemName, redeemedBookTitle, context\.isAdminPortal\)/);
});

test("site settings controls are gone while saved values remain intact", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  const settings = read("supabase/functions/admin-settings/index.ts");
  assert.doesNotMatch(html, /id="adminSeedPrice"|id="adminBlessingWallEnabled"|id="saveAdminButton"|2\. Site settings/);
  assert.doesNotMatch(app, /getAdminSettings|saveAdminButton|adminInputs/);
  assert.doesNotMatch(settings, /applySiteSettings|next\.seedPrice\s*=|next\.blessingWallEnabled\s*=/);
  assert.match(settings, /"seedPrice"[\s\S]*"blessingWallEnabled"/);
  assert.match(settings, /let settingsToSave = \{ \.\.\.existingSettings \}/);
});
