export type SocialSource = "anshu" | "badal";

export const SOCIAL_AUTO_ASSIGN_LIMIT_CENTS = 5500;
// Fixed at the original rule's commit, not at the time a migration is deployed.
export const SOCIAL_LEGACY_ASSIGNMENTS_CUTOFF = "2026-11-09T19:08:45.000Z";

export function parseSocialSource(value: unknown): SocialSource | null {
  return value === "anshu" || value === "badal" ? value : null;
}

export function getAutomaticSocialSource(value: unknown, amountCents: number): SocialSource | null {
  return amountCents >= SOCIAL_AUTO_ASSIGN_LIMIT_CENTS ? null : parseSocialSource(value);
}

export function isSocialAssignmentApproved(donation: any) {
  if (!parseSocialSource(donation.social_source)) return false;
  const amountCents = Math.round(Number(donation.amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) return false;
  if (amountCents < SOCIAL_AUTO_ASSIGN_LIMIT_CENTS) return true;
  if (donation.social_source_manually_assigned !== true) return false;
  const verifiedAt = Date.parse(donation.social_source_verified_at || "");
  if (Number.isFinite(verifiedAt) && donation.social_source_verified_by) return true;
  const createdAt = Date.parse(donation.created_at || "");
  return Number.isFinite(createdAt) && createdAt < Date.parse(SOCIAL_LEGACY_ASSIGNMENTS_CUTOFF);
}
