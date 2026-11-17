export type SocialSource = "anshu" | "badal" | "rohit" | "alok" | "ayush";

// 16 November 2026, 00:00 Asia/Kolkata, inclusive.
export const SOCIAL_PORTAL_START = "2026-11-15T18:30:00.000Z";

// Preserve existing assigned history; switch only new orders from 17 Nov.
export const SOCIAL_PARTNER_HISTORY_START = "2026-11-03T18:30:00.000Z";
// 17 November 2026, 00:00 Asia/Kolkata.
export const SOCIAL_LIMIT_CHANGE_START = "2026-11-16T18:30:00.000Z";
export const SOCIAL_ELIGIBLE_ORDER_FILTER = `amount.lt.33,and(amount.lt.55,created_at.lt.${SOCIAL_LIMIT_CHANGE_START})`;
export const SOCIAL_EXCLUSIVE_ORDER_FILTER = `amount.gte.55,and(amount.gte.33,created_at.gte.${SOCIAL_LIMIT_CHANGE_START})`;

export function getSocialLimitCents(createdAt = new Date().toISOString()) {
  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) && timestamp < Date.parse("2026-11-16T18:30:00.000Z") ? 5500 : 3300;
}

export function parseSocialSource(value: unknown): SocialSource | null {
  return value === "anshu" || value === "badal" || value === "rohit" || value === "alok" || value === "ayush" ? value : null;
}

export function getAutomaticSocialSource(value: unknown, amountCents: number): SocialSource | null {
  return amountCents >= getSocialLimitCents() ? null : parseSocialSource(value);
}

export function isSocialAssignmentApproved(donation: any) {
  if (!parseSocialSource(donation.social_source)) return false;
  const amountCents = Math.round(Number(donation.amount) * 100);
  const createdAt = Date.parse(donation.created_at || "");
  return Number.isFinite(amountCents) && amountCents > 0 &&
    amountCents < getSocialLimitCents(donation.created_at) &&
    Number.isFinite(createdAt) && createdAt >= Date.parse(SOCIAL_PARTNER_HISTORY_START);
}
