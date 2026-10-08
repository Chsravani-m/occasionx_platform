import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { searchProviders, ProviderSearchResult } from "@/features/search/searchApi";
import { getCategories, getSubcategories, Category, Subcategory } from "@/features/browse/catalogApi";
import { getServiceAttributeSchema, AttributeField } from "@/features/browse/serviceAttributesSchema";
import { Screen, LoadingView } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import { API_GATEWAY_URL } from "@/core/api/client";
import { useLocationContext } from "@/core/context/LocationContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "SearchResults">;

type SortMode = "relevance" | "price_low" | "price_high";

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= full ? "star" : "star-outline"}
          size={13}
          color={i <= full ? "#F59E0B" : colors.border}
        />
      ))}
    </View>
  );
}

function ResultCard({ item, onPress }: { item: ProviderSearchResult; onPress: () => void }) {
  const hasRating = typeof item.rating === "number" && item.rating > 0;

  // Uploaded photos (registration's logo/cover, or a dashboard
  // "display picture") come back as a relative path off this
  // service's own /uploads route and need the gateway prefix - seed
  // data happens to use absolute Unsplash URLs, so this went
  // unnoticed until a provider who'd actually registered showed up
  // with no image (see ProviderCard.tsx for the same treatment used
  // on Browse/Home cards).
  const imageUrl = item.cover_image
    ? item.cover_image.startsWith("http")
      ? item.cover_image
      : `${API_GATEWAY_URL}${item.cover_image}`
    : undefined;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Ionicons name="image-outline" size={26} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.business_name}
        </Text>

        {item.address ? (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.cardAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        ) : null}

        <View style={styles.ratingRow}>
          {hasRating ? (
            <>
              <Stars rating={item.rating!} />
              <Text style={styles.ratingCount}>
                {item.rating!.toFixed(1)} ({item.review_count ?? 0})
              </Text>
            </>
          ) : (
            <Text style={styles.noRating}>No reviews yet</Text>
          )}
        </View>

        {item.verification_status === "VERIFIED" ? (
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={styles.badgeText}>Verified provider</Text>
          </View>
        ) : null}

        <Text style={styles.cardPrice}>
          {item.starting_price !== undefined
            ? `Starting from ₹${item.starting_price.toLocaleString("en-IN")}`
            : "Contact for pricing"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function SearchResultsScreen({ route, navigation }: Props) {
  // The search bar itself lives in the global AppHeader (so it's
  // persistent across every page, not just this one) - it drives this
  // screen purely through route.params.keyword, re-navigating here
  // (which just merges params, no new history entry) on every keystroke.
  const keyword = route.params?.keyword ?? "";
  const [results, setResults] = useState<ProviderSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<SortMode>("relevance");
  const [ratingFilter, setRatingFilter] = useState(false);
  const [nearMe, setNearMe] = useState(true);

  const { resolvedStateId, resolvedDistrictId } = useLocationContext();

  // Subcategory filtering: when the typed keyword matches one of the
  // catalog's own categories (e.g. "photography" -> the "Photography"
  // category), show that category's subcategories as filter chips
  // (Wedding Photography, Candid Photography, ...) so results can be
  // narrowed further, the same way a category page's filter tab would.
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // Attribute filters (Air Conditioned, Cuisine, ...): same
  // category-keyword-matched schema the provider app's Specifications
  // screen uses to collect these values, reused here to render them as
  // filter chips. Values are a flat key -> boolean | string[] map,
  // mirroring web-app's app/search/page.tsx attributeFilters state.
  const [attributeFilters, setAttributeFilters] = useState<Record<string, unknown>>({});

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const matchedCategory = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return null;
    return (
      categories.find((c) => {
        const name = c.name.toLowerCase();
        return name === term || name.includes(term) || term.includes(name);
      }) ?? null
    );
  }, [keyword, categories]);

  const attributeSchema = useMemo(
    () => (matchedCategory ? getServiceAttributeSchema(matchedCategory.name) : null),
    [matchedCategory]
  );

  useEffect(() => {
    setSelectedSubcategoryId(null);
    setAttributeFilters({});
    if (!matchedCategory) {
      setSubcategories([]);
      return;
    }
    let cancelled = false;
    getSubcategories(matchedCategory.id)
      .then((subs) => {
        if (!cancelled) setSubcategories(subs);
      })
      .catch(() => {
        if (!cancelled) setSubcategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [matchedCategory]);

  const toggleAttributeBoolean = (key: string) => {
    setAttributeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAttributeOption = (key: string, option: string) => {
    setAttributeFilters((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  };

  const runSearch = useCallback(
    async (term: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchProviders({
          keyword: term,
          state: nearMe ? resolvedStateId ?? undefined : undefined,
          district: nearMe ? resolvedDistrictId ?? undefined : undefined,
          categoryId: matchedCategory?.id,
          subcategoryId: selectedSubcategoryId ?? undefined,
        });
        setResults(data);
      } catch {
        setError("Couldn't load search results. Pull down or try again.");
      } finally {
        setLoading(false);
      }
    },
    [nearMe, resolvedStateId, resolvedDistrictId, matchedCategory, selectedSubcategoryId]
  );

  useEffect(() => {
    runSearch(keyword);
  }, [keyword, runSearch]);

  const displayed = React.useMemo(() => {
    let list = [...results];
    if (ratingFilter) {
      list = list.filter((p) => (p.rating ?? 0) >= 4);
    }

    // AND across attribute keys, OR within a checkbox_group's selected
    // options - same logic as web-app's app/search/page.tsx
    // filteredProviders loop.
    for (const [key, filterValue] of Object.entries(attributeFilters)) {
      if (Array.isArray(filterValue)) {
        if (filterValue.length === 0) continue;
        list = list.filter((p) => {
          const providerValue = p.attributes?.[key];
          const providerOptions = Array.isArray(providerValue) ? (providerValue as string[]) : [];
          return filterValue.some((option) => providerOptions.includes(option as string));
        });
      } else if (filterValue) {
        list = list.filter((p) => Boolean(p.attributes?.[key]));
      }
    }

    if (sort === "price_low") {
      list.sort((a, b) => (a.starting_price ?? Infinity) - (b.starting_price ?? Infinity));
    } else if (sort === "price_high") {
      list.sort((a, b) => (b.starting_price ?? -Infinity) - (a.starting_price ?? -Infinity));
    }
    return list;
  }, [results, sort, ratingFilter, attributeFilters]);

  return (
    <Screen>
      <View style={styles.chipsRow}>
        <FilterChip
          label="Price: Low to High"
          active={sort === "price_low"}
          onPress={() => setSort(sort === "price_low" ? "relevance" : "price_low")}
        />
        <FilterChip
          label="Price: High to Low"
          active={sort === "price_high"}
          onPress={() => setSort(sort === "price_high" ? "relevance" : "price_high")}
        />
        <FilterChip label="4★ & above" active={ratingFilter} onPress={() => setRatingFilter((v) => !v)} />
        <FilterChip label="Near me" active={nearMe} onPress={() => setNearMe((v) => !v)} />
      </View>

      {matchedCategory && subcategories.length > 0 ? (
        <View style={styles.subcategoryWrap}>
          <Text style={styles.subcategoryLabel}>Filter by {matchedCategory.name}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {subcategories.map((sub) => (
              <FilterChip
                key={sub.id}
                label={sub.name}
                active={selectedSubcategoryId === sub.id}
                onPress={() =>
                  setSelectedSubcategoryId((current) => (current === sub.id ? null : sub.id))
                }
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {attributeSchema
        ? attributeSchema.map((section) => {
            const filterableFields = section.fields.filter(
              (f) => f.type === "boolean" || f.type === "checkbox_group"
            );
            if (filterableFields.length === 0) return null;

            return (
              <View key={section.title} style={styles.subcategoryWrap}>
                <Text style={styles.subcategoryLabel}>{section.title}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {filterableFields.map((field: AttributeField) =>
                    field.type === "boolean" ? (
                      <FilterChip
                        key={field.key}
                        label={field.label}
                        active={!!attributeFilters[field.key]}
                        onPress={() => toggleAttributeBoolean(field.key)}
                      />
                    ) : (
                      (field.options ?? []).map((option) => (
                        <FilterChip
                          key={`${field.key}:${option}`}
                          label={option}
                          active={
                            Array.isArray(attributeFilters[field.key]) &&
                            (attributeFilters[field.key] as string[]).includes(option)
                          }
                          onPress={() => toggleAttributeOption(field.key, option)}
                        />
                      ))
                    )
                  )}
                </ScrollView>
              </View>
            );
          })
        : null}

      {loading ? (
        <LoadingView label="Searching..." />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(p) => p.id}
          style={styles.flatList}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error ?? "No providers matched your search. Try a different keyword or turn off filters."}
            </Text>
          }
          renderItem={({ item }) => (
            <ResultCard
              item={item}
              onPress={() => navigation.navigate("ProviderDetails", { providerId: item.id })}
            />
          )}
        />
      )}
    </Screen>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  subcategoryWrap: {
    paddingTop: 2,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subcategoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  flatList: { flex: 1 },
  list: { padding: 16, paddingTop: 4 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40, paddingHorizontal: 20 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardImage: { width: 96, height: 110 },
  cardImageFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.border },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  cardName: { fontSize: 15, fontWeight: "700", color: colors.text },
  addressRow: { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 3 },
  cardAddress: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  starsRow: { flexDirection: "row" },
  ratingCount: { fontSize: 12, color: colors.textMuted },
  noRating: { fontSize: 12, color: colors.textMuted },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  badgeText: { fontSize: 11, color: colors.success, fontWeight: "600" },
  cardPrice: { marginTop: 6, color: colors.primary, fontWeight: "700", fontSize: 13 },
});
