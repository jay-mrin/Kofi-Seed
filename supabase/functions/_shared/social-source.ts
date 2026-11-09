export type SocialSource = "anshu" | "badal";

export const SOCIAL_AUTO_ASSIGN_LIMIT_CENTS = 5500;

export function parseSocialSource(value: unknown): SocialSource | null {
  return value === "anshu" || value === "badal" ? value : null;
}

export function getAutomaticSocialSource(value: unknown, amountCents: number): SocialSource | null {
  return amountCents >= SOCIAL_AUTO_ASSIGN_LIMIT_CENTS ? null : parseSocialSource(value);
}
