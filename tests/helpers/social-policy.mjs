import { readFileSync } from "node:fs";
import vm from "node:vm";
const rules = readFileSync(new URL("../../supabase/functions/_shared/social-source.ts", import.meta.url), "utf8")
  .replace(/^export type .*;\n/gm, "").replaceAll("export ", "")
  .replaceAll("value: unknown", "value").replaceAll("amountCents: number", "amountCents")
  .replaceAll("donation: any", "donation").replaceAll(": SocialSource | null", "");
export const policy = vm.runInNewContext(`${rules}; ({ getSocialLimitCents, SOCIAL_PORTAL_START, SOCIAL_PARTNER_HISTORY_START, SOCIAL_LIMIT_CHANGE_START, SOCIAL_ELIGIBLE_ORDER_FILTER, SOCIAL_EXCLUSIVE_ORDER_FILTER })`);
export const getSocialLimitCents = policy.getSocialLimitCents;
export function fixedDate(timestamp) {
  return class extends Date {
    constructor(...args) { super(...(args.length ? args : [timestamp])); }
    static now() { return Date.parse(timestamp); }
  };
}
