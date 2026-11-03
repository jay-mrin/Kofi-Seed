export type SocialSource = "anshu" | "badal";

export function parseSocialSource(value: unknown): SocialSource | null {
  return value === "anshu" || value === "badal" ? value : null;
}
