import { Ionicons } from "@expo/vector-icons";

export type IoniconName = keyof typeof Ionicons.glyphMap;

// Shared colorful-tile-per-category treatment used across Home, Browse
// and Profile - no real per-category photography exists yet, so a
// cycled color palette plus a keyword-matched icon stands in for a
// photo. Kept in one place so all three screens stay visually
// consistent instead of drifting.
export const TILE_COLORS = [
  "#FDE68A",
  "#93C5FD",
  "#FCA5A5",
  "#6EE7B7",
  "#C4B5FD",
  "#FDBA74",
  "#F9A8D4",
  "#67E8F9",
  "#BEF264",
  "#FCD34D",
];

export const ICON_RULES: [string[], IoniconName][] = [
  [["photo"], "camera-outline"],
  [["video", "streaming", "media coverage"], "videocam-outline"],
  [["decor"], "color-palette-outline"],
  [["venue"], "business-outline"],
  [["cater", "food stall", "cake", "bakery", "live counter"], "restaurant-outline"],
  [["music", "band", "dance", "anchor", "emcee", "entertain"], "musical-notes-outline"],
  [["makeup", "groom", "bridal", "wellness", "spa", "outfit", "styling"], "sparkles-outline"],
  [["planning", "registration", "essential"], "clipboard-outline"],
  [["invit", "printing"], "mail-outline"],
  [["audio", "visual", "technology", "sound"], "headset-outline"],
  [["transport", "travel"], "car-outline"],
  [["accommodation"], "bed-outline"],
  [["security"], "shield-checkmark-outline"],
  [["staffing"], "people-outline"],
  [["furniture", "rental"], "cube-outline"],
  [["tent"], "home-outline"],
  [["power", "utilit", "fireworks"], "flash-outline"],
  [["wedding"], "heart-outline"],
  [["religious", "ritual", "spiritual"], "moon-outline"],
  [["birthday", "gifting"], "gift-outline"],
  [["corporate", "brand", "marketing", "promotion"], "briefcase-outline"],
  [["florist"], "leaf-outline"],
  [["luxury", "celebrity", "artist"], "star-outline"],
];

export function iconFor(name: string): IoniconName {
  const lower = name.toLowerCase();
  for (const [keywords, icon] of ICON_RULES) {
    if (keywords.some((k) => lower.includes(k))) return icon;
  }
  return "apps-outline";
}
