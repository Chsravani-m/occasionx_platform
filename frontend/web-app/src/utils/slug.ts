export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&/]/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Maps the fixed slugs used in the sidebar drawer to a keyword that should
// appear in the real category/event-type name, since seeded names don't
// always match the short drawer slug 1:1 (e.g. "makeup-mehendi" vs.
// "Makeup & Mehendi Artists").
export const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  venues: "venue",
  catering: "catering",
  photography: "photography",
  decor: "decor",
  purohits: "purohit",
  "makeup-mehendi": "makeup",
  entertainment: "entertainment",
  "invitations-gifts": "invitation",
  logistics: "logistics",
};

export const EVENT_TYPE_SLUG_ALIASES: Record<string, string> = {
  weddings: "wedding",
  "birthday-parties": "birthday",
  corporate: "corporate",
  housewarming: "housewarming",
  engagement: "engagement",
  "baby-shower": "baby shower",
  college: "college",
  "religious-rituals": "religious",
};

export function findByAliasedSlug<T extends { name: string }>(
  items: T[],
  slug: string,
  aliasMap: Record<string, string>
): T | undefined {
  const alias = aliasMap[slug];

  if (alias) {
    // An exact name match (e.g. alias "wedding" -> item name
    // "Wedding") must win over a same-substring item that comes
    // earlier in the array (e.g. "Destination Wedding" also contains
    // "wedding" and would otherwise be picked first by .find()) -
    // otherwise clicking "Weddings" from the nav can silently land on
    // the wrong event type.
    const exact = items.find(
      (item) => item.name.toLowerCase() === alias
    );

    if (exact) return exact;

    const match = items.find((item) =>
      item.name.toLowerCase().includes(alias)
    );

    if (match) return match;
  }

  return (
    items.find((item) => generateSlug(item.name) === slug) ||
    items.find(
      (item) =>
        generateSlug(item.name).includes(slug) ||
        slug.includes(generateSlug(item.name))
    )
  );
}
