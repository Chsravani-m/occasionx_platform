import type { PricingType } from "@/services/providerPricingApi";

// Which Pricing Type options make sense for a given category - e.g. a
// caterer prices Per Plate/Per Person, not Hourly/Per Day, while a
// venue or accommodation is priced Per Day/Fixed, not Per Plate.
// Keyword-matched against the category name, same approach as
// utils/serviceAttributesSchema.ts, since categories are admin-defined
// free text rather than a fixed enum. Falls back to every pricing type
// when no bucket matches, so unrecognized/new categories stay
// unrestricted.

export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  FIXED: "Fixed Price",
  HOURLY: "Hourly",
  PACKAGE: "Package",
  PER_PERSON: "Per Person",
  PER_PLATE: "Per Plate",
  PER_DAY: "Per Day",
  CUSTOM: "Custom Quote",
};

const ALL_PRICING_TYPES: PricingType[] = [
  "FIXED",
  "HOURLY",
  "PACKAGE",
  "PER_PERSON",
  "PER_PLATE",
  "PER_DAY",
  "CUSTOM",
];

interface PricingTypeRule {
  keywords: string[];
  allowedTypes: PricingType[];
}

const PRICING_TYPE_RULES: PricingTypeRule[] = [
  // Accommodation - priced per night/stay, not per plate or hourly
  {
    keywords: ["accommodation"],
    allowedTypes: ["FIXED", "PER_DAY", "PACKAGE", "CUSTOM"],
  },

  // Venues & Locations - priced per day/rental, not per plate
  {
    keywords: ["venue"],
    allowedTypes: ["FIXED", "PER_DAY", "PACKAGE", "CUSTOM"],
  },

  // Catering & Food - priced per plate/person, not hourly or per day
  {
    keywords: ["cater"],
    allowedTypes: ["FIXED", "PER_PLATE", "PER_PERSON", "PACKAGE", "CUSTOM"],
  },

  // Decor & Ambience - flat/package jobs
  {
    keywords: ["decor"],
    allowedTypes: ["FIXED", "PACKAGE", "CUSTOM"],
  },

  // Entertainment (Music Bands, Dance Performers, Anchors & Emcees,
  // Artist/Celebrity Management)
  {
    keywords: [
      "entertain",
      "music band",
      "dance",
      "dj",
      "anchor",
      "emcee",
      "artist management",
      "celebrity",
    ],
    allowedTypes: ["FIXED", "HOURLY", "PACKAGE", "CUSTOM"],
  },

  // Photography & Videography
  {
    keywords: ["photograph", "videograph", "media coverage", "live streaming"],
    allowedTypes: ["FIXED", "HOURLY", "PACKAGE", "CUSTOM"],
  },

  // Outfits & Styling
  {
    keywords: ["makeup", "bridal", "groom", "wedding shopping", "outfit", "styling"],
    allowedTypes: ["FIXED", "PER_PERSON", "PACKAGE", "CUSTOM"],
  },

  // Invitations & Gifting
  {
    keywords: ["invitation", "gifting", "printing"],
    allowedTypes: ["FIXED", "PACKAGE", "CUSTOM"],
  },

  // Travel & Logistics
  {
    keywords: ["transport", "travel"],
    allowedTypes: ["FIXED", "PER_DAY", "PACKAGE", "CUSTOM"],
  },

  // Event Essentials
  {
    keywords: [
      "security",
      "event staffing",
      "furniture",
      "tent house",
      "power",
      "utilit",
      "event technology",
      "event essentials",
    ],
    allowedTypes: ["FIXED", "PER_DAY", "PACKAGE", "CUSTOM"],
  },

  // Spiritual & Ritual Services
  {
    keywords: ["religious", "purohit", "pandit", "ritual"],
    allowedTypes: ["FIXED", "PACKAGE", "CUSTOM"],
  },

  // Special Add-ons (Special Attractions)
  {
    keywords: ["special attraction", "fireworks", "effects", "special add"],
    allowedTypes: ["FIXED", "PACKAGE", "CUSTOM"],
  },

  // Florists
  {
    keywords: ["florist"],
    allowedTypes: ["FIXED", "PACKAGE", "CUSTOM"],
  },
];

export function getAllowedPricingTypes(categoryName: string): PricingType[] {
  const lower = categoryName.toLowerCase();

  const rule = PRICING_TYPE_RULES.find((r) =>
    r.keywords.some((kw) => lower.includes(kw))
  );

  return rule ? rule.allowedTypes : ALL_PRICING_TYPES;
}
