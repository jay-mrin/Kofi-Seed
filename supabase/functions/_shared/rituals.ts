export const RITUALS = {
  "199": {
    priceCents: 19900,
    productId: "pdt_0NqfgfmW3N3YEOYOdQeqZ",
    itemName: "The Stories We Left Behind",
  },
  "299": {
    priceCents: 29900,
    productId: "pdt_0NqfgsCjN9s7aPwZUT3Zp",
    itemName: "Of Little Things & Passing Days",
  },
  "399": {
    priceCents: 39900,
    productId: "pdt_0Nqfh88mzTwN3HdozCrZ3",
    itemName: "Whisper of Grace",
  },
  "499": {
    priceCents: 49900,
    productId: "pdt_0NqfhFlg3qTBuktD9n3K2",
    itemName: "Christ Garden Full Collection",
  },
} as const;

export type RitualTier = keyof typeof RITUALS;

export function getRitual(tier: unknown) {
  const key = String(tier);
  return Object.hasOwn(RITUALS, key) ? RITUALS[key as RitualTier] : null;
}
