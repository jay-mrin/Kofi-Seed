export type SocialSource = "anshu" | "badal" | "rohit";

export const SOCIAL_AUTO_ASSIGN_LIMIT_CENTS = 5500;
// User's final policy: 10 November 2026, 21:30:40 Asia/Kolkata.
export const SOCIAL_HIGH_VALUE_EXCLUSION_START = "2026-11-10T16:00:40.000Z";

export function parseSocialSource(value: unknown): SocialSource | null {
  return value === "anshu" || value === "badal" || value === "rohit" ? value : null;
}

export function getAutomaticSocialSource(value: unknown, amountCents: number): SocialSource | null {
  return amountCents >= SOCIAL_AUTO_ASSIGN_LIMIT_CENTS ? null : parseSocialSource(value);
}

export function isSocialAssignmentApproved(donation: any) {
  if (!parseSocialSource(donation.social_source)) return false;
  const amountCents = Math.round(Number(donation.amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) return false;
  if (amountCents < SOCIAL_AUTO_ASSIGN_LIMIT_CENTS) return true;
  if (donation.social_source === "rohit") return false;
  const createdAt = Date.parse(donation.created_at || "");
  return Number.isFinite(createdAt) && createdAt < Date.parse(SOCIAL_HIGH_VALUE_EXCLUSION_START);
}
