import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, ScrollView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCategories, Category } from "@/features/browse/catalogApi";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import { TILE_COLORS, iconFor, type IoniconName } from "@/core/utils/categoryIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "Home">;

// Same curation web's PopularSearchCategories section uses - feature
// these categories first (fuzzy keyword match against real category
// names), then fill any remaining slots from the rest of the list, so
// the row is never empty even before providers/bookings exist to
// derive real "most searched" analytics from.
const FEATURED_KEYWORDS = ["accommodation", "venue", "catering", "photography", "decor"];

// Placeholder banners for the white space left below "Most Searched" -
// real animated deals content will replace this later. These just
// auto-scroll so the space doesn't sit dead in the meantime. Light
// pastel backgrounds with a soft shadow + a matching darker accent for
// the icon/text, rather than bold saturated fills.
const DEAL_PLACEHOLDERS: { icon: IoniconName; bg: string; accent: string; title: string; subtitle: string }[] = [
  { icon: "flash-outline", bg: "#E0EAFF", accent: "#3B5FE0", title: "Deals & Offers", subtitle: "Exciting savings are on the way" },
  { icon: "sparkles-outline", bg: "#F1E6FF", accent: "#8B5CF6", title: "Festive Picks", subtitle: "Curated offers for every occasion" },
  { icon: "gift-outline", bg: "#FFE3F0", accent: "#EC4899", title: "Special Discounts", subtitle: "Coming soon to OccasionX" },
  { icon: "trending-up-outline", bg: "#DFF7E9", accent: "#10B981", title: "Trending Deals", subtitle: "Handpicked by our team" },
  { icon: "ribbon-outline", bg: "#FFE9D6", accent: "#F97316", title: "New Provider Offers", subtitle: "Fresh deals, launching soon" },
];
const SCREEN_WIDTH = Dimensions.get("window").width;
const DEAL_CARD_WIDTH = SCREEN_WIDTH - 32;
const DEAL_CARD_GAP = 12;

export default function HomeScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dealsListRef = useRef<FlatList>(null);
  const dealIndexRef = useRef(0);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getCategories();
      setCategories(data);
    } catch {
      setError("Couldn't load categories. Pull down to retry.");
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Auto-advance the placeholder deals carousel so the space doesn't
  // sit static while there's no real deals content yet.
  useEffect(() => {
    const interval = setInterval(() => {
      dealIndexRef.current = (dealIndexRef.current + 1) % DEAL_PLACEHOLDERS.length;
      dealsListRef.current?.scrollToOffset({
        offset: dealIndexRef.current * (DEAL_CARD_WIDTH + DEAL_CARD_GAP),
        animated: true,
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const mostSearched = useMemo(() => {
    const featured: Category[] = [];
    FEATURED_KEYWORDS.forEach((keyword) => {
      const match = categories.find(
        (c) => c.name.toLowerCase().includes(keyword) && !featured.some((f) => f.id === c.id)
      );
      if (match) featured.push(match);
    });
    categories.forEach((c) => {
      if (featured.length >= 6) return;
      if (!featured.some((f) => f.id === c.id)) featured.push(c);
    });
    return featured.slice(0, 6);
  }, [categories]);

  const goToCategory = (item: Category) =>
    navigation.navigate("CategoryProviders", { categoryId: item.id, categoryName: item.name });

  if (loading) return <LoadingView label="Loading OccasionX..." />;

  return (
    <Screen>
      {error ? <ErrorView message={error} /> : null}

      <ScrollView
        style={styles.flatList}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {mostSearched.length ? (
          <View style={styles.trendingSection}>
            <Text style={styles.trendingTitle}>Most Searched</Text>
            <FlatList
              data={mostSearched}
              keyExtractor={(c) => `trend-${c.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
              renderItem={({ item, index }) => (
                <Pressable style={styles.trendingCard} onPress={() => goToCategory(item)}>
                  <View
                    style={[
                      styles.trendingIconWrap,
                      { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] },
                    ]}
                  >
                    <Ionicons name={iconFor(item.name)} size={24} color="#fff" />
                  </View>
                  <Text style={styles.trendingCardText} numberOfLines={2}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        <View style={styles.dealsSection}>
          <View style={styles.dealsHeaderRow}>
            <Text style={styles.dealsTitle}>Deals & Offers</Text>
            <View style={styles.dealsBadge}>
              <Text style={styles.dealsBadgeText}>Coming Soon</Text>
            </View>
          </View>
          <FlatList
            ref={dealsListRef}
            data={DEAL_PLACEHOLDERS}
            keyExtractor={(_, i) => `deal-${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={DEAL_CARD_WIDTH + DEAL_CARD_GAP}
            decelerationRate="fast"
            style={styles.dealsFlatList}
            contentContainerStyle={styles.dealsList}
            renderItem={({ item }) => (
              <View style={[styles.dealCard, { backgroundColor: item.bg }]}>
                <View style={[styles.dealIconWrap, { backgroundColor: "#fff" }]}>
                  <Ionicons name={item.icon} size={30} color={item.accent} />
                </View>
                <Text style={[styles.dealCardTitle, { color: item.accent }]}>{item.title}</Text>
                <Text style={styles.dealCardSubtitle}>{item.subtitle}</Text>
              </View>
            )}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  trendingSection: {
    backgroundColor: colors.ivory,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 14,
    paddingBottom: 18,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 4,
  },
  trendingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  trendingList: { paddingRight: 4, gap: 4 },
  trendingCard: {
    alignItems: "center",
    width: 76,
    marginRight: 12,
  },
  trendingIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  trendingCardText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    lineHeight: 15,
  },
  flatList: { flex: 1 },
  list: { padding: 16, flexGrow: 1 },
  dealsSection: { marginTop: 20, flex: 1, minHeight: 220 },
  dealsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dealsTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  dealsBadge: {
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dealsBadgeText: { fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.3 },
  dealsFlatList: { flex: 1 },
  dealsList: { flexGrow: 1, paddingBottom: 4 },
  dealCard: {
    width: DEAL_CARD_WIDTH,
    marginRight: DEAL_CARD_GAP,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  dealIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  dealCardTitle: { marginTop: 16, fontSize: 18, fontWeight: "700", textAlign: "center" },
  dealCardSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});
