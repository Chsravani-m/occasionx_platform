import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCategories, Category } from "@/features/browse/catalogApi";
import { getProvidersByCategory, getRecentlyAddedProviders, CategoryProvider } from "@/features/providers/providerApi";
import { Screen, ErrorView } from "@/core/components/Screen";
import ProviderCard from "@/core/components/ProviderCard";
import { colors } from "@/core/theme/colors";
import { useLocationContext } from "@/core/context/LocationContext";
import { TILE_COLORS, iconFor } from "@/core/utils/categoryIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "Browse">;

// Left rail = every category, top ones first. Right panel = that
// category's providers, shown in place - tapping a rail item just
// swaps what's on the right, it never navigates to a separate page.
// We don't have per-category photography, so every rail icon gets a
// distinct background color (cycled from this palette) standing in
// for a photo.

// Same curation as HomeScreen's "Most Searched" row - these are the
// "top rated" categories, placed first in the single rail list and
// used to pick what the right panel shows by default (no separate
// tab needed - it's just the top of the same list).
const FEATURED_KEYWORDS = ["accommodation", "venue", "catering", "photography", "decor", "entertain"];

// A pinned pseudo-category at the top of the rail, selected by
// default instead of always landing on whichever real category
// happens to sort first (previously always "Accommodation") - shows
// the newest verified providers across every category.
const RECENT_ID = "__recently_added__";
const RECENT_ITEM: Category = { id: RECENT_ID, name: "Recently Added" };

export default function BrowseScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>(RECENT_ID);

  const [providers, setProviders] = useState<CategoryProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providersError, setProvidersError] = useState<string | null>(null);

  const { resolvedStateId, resolvedDistrictId } = useLocationContext();

  // Every category, top-rated ones first.
  const allSorted = useMemo(() => {
    const featured: Category[] = [];
    FEATURED_KEYWORDS.forEach((keyword) => {
      const match = categories.find(
        (c) => c.name.toLowerCase().includes(keyword) && !featured.some((f) => f.id === c.id)
      );
      if (match) featured.push(match);
    });
    const rest = categories.filter((c) => !featured.some((f) => f.id === c.id));
    return [...featured, ...rest];
  }, [categories]);

  // Recently Added pinned first, then every category.
  const railData = useMemo(() => [RECENT_ITEM, ...allSorted], [allSorted]);

  useEffect(() => {
    getCategories()
      .then((data) => {
        setCategories(data);
      })
      .catch(() => setError("Couldn't load categories. Pull to retry."))
      .finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    setLoadingProviders(true);
    setProvidersError(null);
    const request =
      selectedId === RECENT_ID
        ? getRecentlyAddedProviders(resolvedStateId ?? undefined, resolvedDistrictId ?? undefined)
        : getProvidersByCategory(selectedId, resolvedStateId ?? undefined, resolvedDistrictId ?? undefined);
    request
      .then(setProviders)
      .catch(() =>
        setProvidersError(
          selectedId === RECENT_ID
            ? "Couldn't load recently added providers."
            : "Couldn't load providers for this category."
        )
      )
      .finally(() => setLoadingProviders(false));
  }, [selectedId, resolvedStateId, resolvedDistrictId]);

  const selectedCategory =
    selectedId === RECENT_ID ? RECENT_ITEM : allSorted.find((c) => c.id === selectedId) ?? null;

  if (loadingCategories) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error) return <ErrorView message={error} />;

  return (
    <Screen>
      <View style={styles.body}>
        {/* Left: every category, top-rated ones first - tapping one
            just swaps the right panel's selection, no navigation. */}
        <View style={styles.railWrap}>
          <FlatList
            data={railData}
            keyExtractor={(c) => `rail-${c.id}`}
            style={styles.rail}
            contentContainerStyle={styles.railContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const active = item.id === selectedId;
              const isRecent = item.id === RECENT_ID;
              return (
                <Pressable
                  style={[styles.railItem, active && styles.railItemActive]}
                  onPress={() => setSelectedId(item.id)}
                >
                  <View
                    style={[styles.railIcon, { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] }]}
                  >
                    <Ionicons
                      name={isRecent ? "sparkles-outline" : iconFor(item.name)}
                      size={16}
                      color="#fff"
                    />
                  </View>
                  <Text style={[styles.railLabel, active && styles.railLabelActive]} numberOfLines={3}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Right: the selected category's providers, in place. */}
        <View style={styles.panel}>
          {loadingProviders ? (
            <ActivityIndicator style={styles.panelLoading} color={colors.primary} />
          ) : (
            <FlatList
              data={providers}
              keyExtractor={(p) => p.id}
              style={styles.panelList}
              contentContainerStyle={styles.panelListContent}
              ListHeaderComponent={
                selectedCategory ? <Text style={styles.panelTitle}>{selectedCategory.name}</Text> : null
              }
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {providersError ??
                    (selectedId === RECENT_ID
                      ? "No providers added yet."
                      : "No providers found in this category yet.")}
                </Text>
              }
              renderItem={({ item }) => (
                <ProviderCard
                  provider={item}
                  onPress={() => navigation.navigate("ProviderDetails", { providerId: item.id })}
                />
              )}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

const RAIL_WIDTH = 84;

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, flexDirection: "row" },
  railWrap: {
    width: RAIL_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  rail: { flex: 1 },
  railContent: { paddingVertical: 4 },
  railItem: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  railItemActive: { backgroundColor: colors.background, borderLeftColor: colors.primary },
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
  railLabelActive: { color: colors.primary, fontWeight: "700" },
  panel: { flex: 1 },
  panelLoading: { marginTop: 40 },
  panelList: { flex: 1 },
  panelListContent: { padding: 16 },
  panelTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 },
  empty: { color: colors.textMuted, fontSize: 13, marginTop: 20, textAlign: "center" },
});
