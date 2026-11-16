export type SocialSource = "anshu" | "badal" | "rohit" | "alok";

export const SOCIAL_AUTO_ASSIGN_LIMIT_CENTS = 3300;
// 16 November 2026, 00:00 Asia/Kolkata, inclusive.
export const SOCIAL_PORTAL_START = "2026-11-15T18:30:00.000Z";

export function parseSocialSource(value: unknown): SocialSource | null {
  return value === "anshu" || value === "badal" || value === "rohit" || value === "alok" ? value : null;
}

export function getAutomaticSocialSource(value: unknown, amountCents: number): SocialSource | null {
  return amountCents >= SOCIAL_AUTO_ASSIGN_LIMIT_CENTS ? null : parseSocialSource(value);
}

export function isSocialAssignmentApproved(donation: any) {
  if (!parseSocialSource(donation.social_source)) return false;
  const amountCents = Math.round(Number(donation.amount) * 100);
  const createdAt = Date.parse(donation.created_at || "");
  return Number.isFinite(amountCents) && amountCents > 0 &&
    amountCents < SOCIAL_AUTO_ASSIGN_LIMIT_CENTS &&
    Number.isFinite(createdAt) && createdAt >= Date.parse(SOCIAL_PORTAL_START);
}
