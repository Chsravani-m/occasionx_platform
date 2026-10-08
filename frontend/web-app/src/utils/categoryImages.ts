// Curated cover images for catalog categories, so category browsing
// (the /categories grid, and the hero on each category's detail page)
// shows real, on-theme photography instead of a bare text card.
//
// Categories are free-text names set by admins (see
// services/catalog-service/app/seeders/categories.py and the
// admin Categories page), not a fixed enum, so this can't just be a
// name -> id lookup table for exact matches. Instead each rule lists
// candidate photos for a theme, matched via keyword against the
// category name (case-insensitive, checked in order - first rule
// match wins).
//
// Multiple categories can legitimately share a theme (e.g. "Music
// Bands" and "Dance Performers" are both "entertainment"), so a
// single rule can still be the best match for several categories.
// To avoid two categories in the same grid ever rendering the exact
// same photo, assignCategoryImages() below resolves images for a
// *whole list at once* and de-duplicates: if a category's first-pick
// photo is already used by an earlier category, it walks that rule's
// other candidates, then falls back to a photo keyed uniquely by the
// category's id (guaranteed distinct across categories, since ids
// are unique) rather than ever repeating a photo on screen.
//
// Image source: self-hosted from public/images/categories/{photoId}.jpg
// (downloaded once via scripts/download-category-images.mjs - run that
// after adding/changing any photoId below, then commit the images).
// Serving these from the app's own storage instead of hotlinking
// images.unsplash.com avoids depending on Unsplash's CDN staying up
// and reachable for every production page load; the Unsplash License
// itself already permits this free commercial use. If a local file is
// ever missing (e.g. the download script hasn't been run yet, or a
// new photoId was just added), CategoryImage's onError handler swaps
// to the picsum.photos fallback below instead of showing a broken
// image.

interface CategoryImageRule {
  keywords: string[];
  photoIds: string[];
}

const CATEGORY_IMAGE_RULES: CategoryImageRule[] = [
  // Indian-wedding/festival themed (per explicit request - keep these
  // visually traditional rather than generic Western stock photos).
  { keywords: ["photograph"], photoIds: ["1611550287705-7ff8b459c8eb", "1756143058493-2d14887e41e6"] },
  { keywords: ["media coverage"], photoIds: ["1495020689067-958852a7765e", "1478720568477-152d9b164e26"] },
  { keywords: ["decor"], photoIds: ["1587271407850-8d438ca9fdf2", "1744805624890-9931ebb50428"] },
  { keywords: ["food stall"], photoIds: ["1601050690597-df0568f70950", "1596797038530-2c107229654b"] },
  { keywords: ["kids"], photoIds: ["1509666537727-9154b6962292", "1529347599731-ec02b259c9f0"] },
  { keywords: ["makeup", "outfit", "styling"], photoIds: ["1613966802194-d46a163af70d", "1610047614301-13c63f00c032"] },
  { keywords: ["music band"], photoIds: ["1511379938547-c1f69419868d", "1623771859039-e435068f39d7"] },
  { keywords: ["printing"], photoIds: ["1581508512961-0e3b9524db40", "1595142571206-88f8c64a9845"] },
  { keywords: ["registration"], photoIds: ["1781038507661-06501ddcdc90", "1781038507123-cbebc8ec508c"] },
  { keywords: ["religious", "purohit", "pandit", "ritual"], photoIds: ["1605292356183-a77d0a9c9d1d", "1662720868850-e60cefb03201"] },
  { keywords: ["rental"], photoIds: ["1643804926339-e94f0a655185", "1557598628-bdd7d0767917"] },
  { keywords: ["security"], photoIds: ["1760228604788-db8a36d5c1a3", "1653592956557-48ae49fc5ef5"] },
  { keywords: ["tent house"], photoIds: ["1768179123386-a86a85f1c35c", "1780682568331-2bc7318210ce"] },
  { keywords: ["ticketing"], photoIds: ["1578575436955-ef29da568c6c", "1563841930606-67e2bce48b78"] },
  { keywords: ["shopping"], photoIds: ["1570055349452-29232699cc63", "1542042161784-26ab9e041e89"] },
  { keywords: ["wellness", "spa"], photoIds: ["1544161515-4ab6ce6db874", "1639162906614-0603b0ae95fd"] },
  { keywords: ["bridal"], photoIds: ["1779253806487-401be91cc024", "1730003873829-09b4b16444c1"] },
  { keywords: ["groom"], photoIds: ["1759906766080-82b785c61f51", "1759906693830-a2449013bd94"] },
  { keywords: ["celebrity"], photoIds: ["1606744038221-5e0fa1c68fe6", "1772581384962-f0e405416931"] },

  // Everything else - unchanged from before.
  { keywords: ["videograph", "live streaming"], photoIds: ["1478720568477-152d9b164e26", "1568772585407-9361f9bf3a87"] },
  { keywords: ["florist", "flower"], photoIds: ["1519378058457-4c29a0a2efac", "1487070183336-b863922373d4"] },
  { keywords: ["destination wedding"], photoIds: ["1520854221256-17451cc331bf", "1519167758481-83f550bb49b3"] },
  { keywords: ["venue"], photoIds: ["1519167758481-83f550bb49b3", "1464366400600-7168b8af9bc3"] },
  { keywords: ["live counter"], photoIds: ["1555244162-803834f70033", "1414235077428-338989a2e8c0"] },
  { keywords: ["cater"], photoIds: ["1555244162-803834f70033", "1414235077428-338989a2e8c0"] },
  { keywords: ["cake", "bakery"], photoIds: ["1535141192574-5d4897c12636", "1464349095061-83781ba51dcb"] },
  { keywords: ["dance"], photoIds: ["1508700115892-45ecd05ae2ad", "1518834107812-67b0b7c58434"] },
  { keywords: ["dj"], photoIds: ["1470229722913-7c0e2dbbafd3", "1493225457124-a3eb161ffa5f"] },
  { keywords: ["entertain"], photoIds: ["1493225457124-a3eb161ffa5f", "1470229722913-7c0e2dbbafd3"] },
  { keywords: ["event staffing"], photoIds: ["1521737604893-d14cc237f11d", "1511578314322-379afb476865"] },
  { keywords: ["event technology"], photoIds: ["1651975414464-e9226c50c7e1", "1703890641448-8b56191d7bdc"] },
  { keywords: ["event planning", "event essentials"], photoIds: ["1511795409834-ef04bbd61622", "1478146059778-26028b07395a"] },
  { keywords: ["gifting"], photoIds: ["1549465220-1a8b9238cd48", "1607344645866-009c320b63e0"] },
  { keywords: ["invitation"], photoIds: ["1607344645866-009c320b63e0", "1549465220-1a8b9238cd48"] },
  { keywords: ["power", "utilit"], photoIds: ["1473341304170-971dccb5ac1e", "1470225620780-dba8ba36b745"] },
  { keywords: ["audio", "visual", "sound", "lighting"], photoIds: ["1470225620780-dba8ba36b745", "1478737270239-2f02b77fc618"] },
  { keywords: ["transport", "car"], photoIds: ["1449965408869-eaa3f722e40d", "1502877338535-766e1452684a"] },
  { keywords: ["travel"], photoIds: ["1436491865332-7a61a109cc05", "1449965408869-eaa3f722e40d"] },
  { keywords: ["accommodation", "hotel", "stay"], photoIds: ["1566073771259-6a8506099945", "1520250497591-112f2f40a3f4"] },
  { keywords: ["furniture"], photoIds: ["1567016432779-094069958ea5", "1493663284031-b7e3aefcae8e"] },
  { keywords: ["birthday"], photoIds: ["1464349153735-7db50ed83c84", "1530103862676-de8c9debad1d"] },
  { keywords: ["corporate"], photoIds: ["1511578314322-379afb476865", "1521737604893-d14cc237f11d"] },
  { keywords: ["anchor", "emcee"], photoIds: ["1478737270239-2f02b77fc618", "1470225620780-dba8ba36b745"] },
  { keywords: ["artist management"], photoIds: ["1470229722913-7c0e2dbbafd3", "1493225457124-a3eb161ffa5f"] },
  { keywords: ["fireworks", "effects"], photoIds: ["1498931299472-f7a63a5a1cfa", "1467810563316-b5476525c0f9"] },
  { keywords: ["special attraction", "special add"], photoIds: ["1467810563316-b5476525c0f9", "1498931299472-f7a63a5a1cfa"] },
  { keywords: ["digital marketing"], photoIds: ["1460925895917-afdab827c52f", "1432888622747-4eb9a8efeb07"] },
  { keywords: ["brand promotion"], photoIds: ["1432888622747-4eb9a8efeb07", "1460925895917-afdab827c52f"] },
  { keywords: ["luxury"], photoIds: ["1519671482749-fd09be7ccebf", "1522771739844-6a9f6d5f14af"] },

  // Generic "wedding" catch-all - kept last so more specific
  // wedding-adjacent rules above (destination wedding, tent house,
  // venue, wedding shopping, bridal, groom, etc.) are checked first.
  { keywords: ["wedding"], photoIds: ["1679937698873-6065742c8d32", "1741201864879-c5e7f81c98b0"] },
];

// Photos used when a category name doesn't match any keyword rule
// above. A small pool (not a single photo) so unmatched categories
// still vary rather than all collapsing onto one generic image.
const FALLBACK_PHOTO_IDS = [
  "1464366400600-7168b8af9bc3",
  "1511795409834-ef04bbd61622",
  "1519741497674-611481863552",
  "1478146059778-26028b07395a",
  "1465495976277-4387d4b0b4c6",
];

function buildImageUrl(photoId: string): string {
  return `/images/categories/${photoId}.jpg`;
}

// Single-category lookup - used where only one image is ever shown at
// a time (e.g. the category detail page hero), so duplicate-avoidance
// across a list doesn't apply.
export function getCategoryImageUrl(categoryName: string): string {
  const lower = categoryName.toLowerCase();

  const rule = CATEGORY_IMAGE_RULES.find((r) =>
    r.keywords.some((kw) => lower.includes(kw))
  );

  const photoId = rule ? rule.photoIds[0] : FALLBACK_PHOTO_IDS[0];

  return buildImageUrl(photoId);
}

// Full ordered list of image URLs to try for a single category, most
// on-theme first: every candidate photo for its matched rule, then
// the guaranteed-to-load picsum fallback last. CategoryImage steps
// through this in order on load failure, so a single 404'd photoId
// (stale/renamed on Unsplash) doesn't bump the category straight down
// to a generic photo when another on-theme candidate would still
// work - see CategoryImage.tsx.
export function getCategoryImageChain(
  categoryName: string,
  fallbackKey: string
): string[] {
  const lower = categoryName.toLowerCase();

  const rule = CATEGORY_IMAGE_RULES.find((r) =>
    r.keywords.some((kw) => lower.includes(kw))
  );

  const candidates = rule ? rule.photoIds : FALLBACK_PHOTO_IDS;

  return [...candidates.map(buildImageUrl), getCategoryFallbackImageUrl(fallbackKey)];
}

// Last-resort fallback if even the curated Unsplash photo fails to
// load (stale id, offline, etc.) - deterministic per key (same key
// always gets the same fallback photo) via picsum.photos, the same
// CDN already used for seed provider portfolio images (see
// provider-service/app/seed_providers.py), so it's a source already
// known to work reliably from this app. Keyed by category id (not
// name) so it's guaranteed unique per category even if two category
// names were ever identical.
export function getCategoryFallbackImageUrl(key: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(key)}/900/600`;
}

interface CategoryLike {
  id: string;
  name: string;
}

// Resolves a cover image *chain* for every category in a list at
// once, guaranteeing no two categories get the same first-choice
// image. Call this once per rendered grid (not per-card) so it can
// see the whole list and de-duplicate.
//
// Each category gets an ordered array of candidate URLs rather than
// a single URL: the de-duplicated pick first, then that category's
// remaining same-theme candidates (in case the pick 404s - stale or
// renamed Unsplash id), then the guaranteed-to-load picsum fallback
// last. CategoryImage steps through the array on load failure so a
// single broken photoId doesn't drop straight to a generic photo
// when another on-theme one would still work.
export function assignCategoryImages(
  categories: CategoryLike[]
): Record<string, string[]> {
  const used = new Set<string>();
  const result: Record<string, string[]> = {};

  for (const category of categories) {
    const lower = category.name.toLowerCase();
    const rule = CATEGORY_IMAGE_RULES.find((r) =>
      r.keywords.some((kw) => lower.includes(kw))
    );

    const candidates = rule ? rule.photoIds : FALLBACK_PHOTO_IDS;

    const freePhotoId = candidates.find((id) => !used.has(id));

    let orderedIds: string[];

    if (freePhotoId) {
      used.add(freePhotoId);
      orderedIds = [freePhotoId, ...candidates.filter((id) => id !== freePhotoId)];
    } else {
      // Every candidate for this category's theme is already taken by
      // an earlier category (only happens with many categories
      // sharing one theme) - the whole theme pool is exhausted, so
      // lead with the id-keyed picsum photo instead of repeating one.
      orderedIds = [];
    }

    result[category.id] = [
      ...orderedIds.map(buildImageUrl),
      getCategoryFallbackImageUrl(category.id),
    ];
  }

  return result;
}
