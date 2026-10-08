import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCategories, Category } from "@/api/catalogApi";
import { Screen, LoadingView, ErrorView } from "@/components/Screen";
import { colors } from "@/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "Browse">;
type IoniconName = keyof typeof Ionicons.glyphMap;

// Matches Amazon's "All Categories" page: a scrollable rail of category
// shortcuts on the left, and a big "Top Categories For You" photo grid
// on the right. We don't have per-category photography yet, so every
// tile (rail + grid) gets a distinct background color (cycled from
// this palette) plus a representative icon standing in for the photo.
const TILE_COLORS = [
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

const ICON_RULES: [string[], IoniconName][] = [
  [["photo"], "camera-outline"],
  [["video", "streaming", "media coverage"], "videocam-outline"],
  [["decor"], "color-palette-outline"],
  [["venue"], "business-outline"],
  [["cater", "food stall", "cake", "bakery", "live counter"], "restaurant-outline"],
  [["music", "band", "dance", "anchor", "emcee", "entertain"], "musical-notes-outline"],
  [["makeup", "groom", "bridal", "wellness", "spa"], "sparkles-outline"],
  [["planning", "registration"], "clipboard-outline"],
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
  [["religious"], "moon-outline"],
  [["birthday", "gifting"], "gift-outline"],
  [["corporate", "brand", "marketing", "promotion"], "briefcase-outline"],
  [["florist"], "leaf-outline"],
  [["luxury", "celebrity", "artist"], "star-outline"],
];

function iconFor(name: string): IoniconName {
  const lower = name.toLowerCase();
  for (const [keywords, icon] of ICON_RULES) {
    if (keywords.some((k) => lower.includes(k))) return icon;
  }
  return "apps-outline";
}

// Same curation as HomeScreen's "Most Searched" row - feature these
// keywords first, then fill the rest, capped to what fits a few rows
// of the right-hand grid (matches the reference screenshot's ~10
// tiles) instead of dumping the whole catalog into it.
const FEATURED_KEYWORDS = ["accommodation", "venue", "catering", "photography", "decor", "entertain"];
const TOP_CATEGORIES_LIMIT = 10;

export default function BrowseScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setError("Couldn't load categories. Pull to retry."))
      .finally(() => setLoading(false));
  }, []);

  const topCategories = useMemo(() => {
    const featured: Category[] = [];
    FEATURED_KEYWORDS.forEach((keyword) => {
      const match = categories.find(
        (c) => c.name.toLowerCase().includes(keyword) && !featured.some((f) => f.id === c.id)
      );
      if (match) featured.push(match);
    });
    categories.forEach((c) => {
      if (featured.length >= TOP_CATEGORIES_LIMIT) return;
      if (!featured.some((f) => f.id === c.id)) featured.push(c);
    });
    return featured.slice(0, TOP_CATEGORIES_LIMIT);
  }, [categories]);

  const openCategory = (item: Category) =>
    navigation.navigate("CategoryProviders", { categoryId: item.id, categoryName: item.name });

  if (loading) return <LoadingView label="Loading categories..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <Screen>
      <View style={styles.body}>
        {/* Left: scrollable rail - every category as a quick shortcut */}
        <FlatList
          data={categories}
          keyExtractor={(c) => `rail-${c.id}`}
          style={styles.rail}
          contentContainerStyle={styles.railContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Pressable style={styles.railItem} onPress={() => openCategory(item)}>
              <View
                style={[styles.railIcon, { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] }]}
              >
                <Ionicons name={iconFor(item.name)} size={18} color="#fff" />
              </View>
              <Text style={styles.railLabel} numberOfLines={3}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />

        {/* Right: the big "Top Categories For You" grid */}
        <View style={styles.panel}>
          <FlatList
            data={topCategories}
            keyExtractor={(c) => `grid-${c.id}`}
            numColumns={3}
            style={styles.panelList}
            contentContainerStyle={styles.panelListContent}
            columnWrapperStyle={styles.panelRow}
            ListHeaderComponent={<Text style={styles.panelTitle}>Top Categories For You</Text>}
            renderItem={({ item, index }) => (
              <Pressable style={styles.tileWrap} onPress={() => openCategory(item)}>
                <View
                  style={[styles.tile, { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] }]}
                >
                  <Ionicons name={iconFor(item.name)} size={30} color="#fff" />
                </View>
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Screen>
  );
}

// Percentage rather than a fixed dp value, so the rail stays this exact
// proportion of the screen (about a quarter) on any device width.
const RAIL_WIDTH = "24%";

const styles = StyleSheet.create({
  body: { flex: 1, flexDirection: "row" },
  rail: { width: RAIL_WIDTH, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border },
  railContent: { paddingVertical: 4 },
  railItem: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  railIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  railLabel: {
    marginTop: 4,
    fontSize: 9,
    color: colors.text,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 11,
  },
  panel: { flex: 1 },
  panelList: { flex: 1 },
  panelListContent: { padding: 16 },
  panelTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 14 },
  panelRow: { justifyContent: "space-between" },
  tileWrap: { flexBasis: "31%", marginBottom: 22, alignItems: "center" },
  tile: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
});
