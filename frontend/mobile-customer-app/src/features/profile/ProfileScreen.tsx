import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, ScrollView, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/core/context/AuthContext";
import { getCustomerBookings, Booking } from "@/features/booking/bookingApi";
import { getCustomerWishlist } from "@/features/wishlist/wishlistApi";
import { getProviderDetails, Provider } from "@/features/providers/providerApi";
import { getCategories, Category } from "@/features/browse/catalogApi";
import { WEB_APP_URL } from "@/core/api/client";
import { Screen } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import { formatDate } from "@/core/utils/format";
import { TILE_COLORS, iconFor } from "@/core/utils/categoryIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "Profile">;

const STATUS_COLORS: Record<string, string> = {
  AWAITING_PAYMENT: colors.warning,
  CONFIRMED: colors.success,
  REJECTED: colors.danger,
  CANCELLED: colors.danger,
  EXPIRED: colors.textMuted,
};

// Same curation as Home/Browse's featured-category row, so the
// "Popular Categories" pick here matches what's surfaced elsewhere
// instead of drifting into a third ordering.
const FEATURED_KEYWORDS = ["accommodation", "venue", "catering", "photography", "decor", "entertain"];

type WishlistEntry = { providerId: string; provider: Provider | null };

export default function ProfileScreen({ navigation }: Props) {
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const popularCategories = useMemo(() => {
    const featured: Category[] = [];
    FEATURED_KEYWORDS.forEach((keyword) => {
      const match = categories.find(
        (c) => c.name.toLowerCase().includes(keyword) && !featured.some((f) => f.id === c.id)
      );
      if (match) featured.push(match);
    });
    categories.forEach((c) => {
      if (featured.length >= 8) return;
      if (!featured.some((f) => f.id === c.id)) featured.push(c);
    });
    return featured.slice(0, 8);
  }, [categories]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;

      getCustomerBookings(user.id)
        .then((data) => setBookings(data.slice(0, 6)))
        .catch(() => {})
        .finally(() => setLoadingBookings(false));

      getCustomerWishlist(user.id)
        .then(async (items) => {
          const top = items.slice(0, 6);
          const resolved = await Promise.all(
            top.map(async (item) => {
              try {
                const details = await getProviderDetails(item.provider_id);
                return { providerId: item.provider_id, provider: details.provider };
              } catch {
                return { providerId: item.provider_id, provider: null };
              }
            })
          );
          setWishlist(resolved);
        })
        .catch(() => {})
        .finally(() => setLoadingWishlist(false));
    }, [user?.id])
  );

  const openSupport = () => {
    Linking.openURL(`${WEB_APP_URL}/support`).catch(() => {
      Alert.alert("Couldn't open Support Center. Please try again.");
    });
  };

  const firstName = (user?.fullName || "there").split(" ")[0];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View>
            {/* Greeting header, mirroring the "Hello, Nanda" row on
                Amazon's You tab. Tapping the greeting opens the full
                view/edit profile screen; the gear opens Settings
                (where Log Out now lives). */}
            <View style={styles.header}>
              <Pressable style={styles.headerTapArea} onPress={() => navigation.navigate("EditProfile")}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={26} color={colors.white} />
                  </View>
                  <View style={styles.avatarEditBadge}>
                    <Ionicons name="pencil" size={11} color={colors.white} />
                  </View>
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.greeting}>Hello, {firstName}</Text>
                  <Text style={styles.contact} numberOfLines={1}>
                    {user?.email || user?.mobile}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
              <Pressable
                style={styles.settingsButton}
                onPress={() => navigation.navigate("Settings")}
                hitSlop={8}
              >
                <Ionicons name="settings-outline" size={22} color={colors.primary} />
              </Pressable>
            </View>

            {/* Quick actions row */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { icon: "calendar-outline" as const, label: "Bookings", onPress: () => navigation.navigate("MyBookings") },
                { icon: "heart-outline" as const, label: "Wishlist", onPress: () => navigation.navigate("Wishlist") },
                { icon: "notifications-outline" as const, label: "Notifications", onPress: () => navigation.navigate("Notifications") },
                { icon: "help-buoy-outline" as const, label: "Support", onPress: openSupport },
              ]}
              keyExtractor={(item) => item.label}
              contentContainerStyle={styles.quickActionsRow}
              renderItem={({ item, index }) => (
                <Pressable
                  style={[styles.quickAction, { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] }]}
                  onPress={item.onPress}
                >
                  <Ionicons name={item.icon} size={20} color={colors.white} />
                  <Text style={styles.quickActionLabel}>{item.label}</Text>
                </Pressable>
              )}
            />

            {/* Your Bookings carousel */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Your Bookings</Text>
              <Pressable
                style={styles.sectionSeeAll}
                onPress={() => navigation.navigate("MyBookings")}
                hitSlop={8}
              >
                <Ionicons name="arrow-forward" size={18} color={colors.text} />
              </Pressable>
            </View>

            {!loadingBookings && bookings.length === 0 ? (
              <Pressable style={styles.emptyCard} onPress={() => navigation.navigate("Browse")}>
                <Text style={styles.emptyText}>
                  You haven't booked anything yet - browse services to get started.
                </Text>
              </Pressable>
            ) : (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={bookings}
                keyExtractor={(b) => b.id}
                contentContainerStyle={styles.carouselContent}
                renderItem={({ item, index }) => (
                  <Pressable
                    style={styles.bookingCard}
                    onPress={() => navigation.navigate("MyBookings")}
                  >
                    <View
                      style={[
                        styles.cardIcon,
                        { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] },
                      ]}
                    >
                      <Ionicons
                        name={iconFor(item.category_name || item.service_name || "")}
                        size={18}
                        color="#fff"
                      />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.service_name || "Service"}
                    </Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>
                      {item.provider_name || "Provider"}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {formatDate(item.event_date)}
                      {item.event_time ? ` · ${item.event_time}` : ""}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: STATUS_COLORS[item.booking_status] || colors.textMuted },
                      ]}
                    >
                      <Text style={styles.statusPillText}>
                        {item.booking_status.replace("_", " ")}
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            )}

            {/* Your Wishlist carousel */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Your Wishlist</Text>
              <Pressable
                style={styles.sectionSeeAll}
                onPress={() => navigation.navigate("Wishlist")}
                hitSlop={8}
              >
                <Ionicons name="arrow-forward" size={18} color={colors.text} />
              </Pressable>
            </View>

            {!loadingWishlist && wishlist.length === 0 ? (
              <Pressable style={styles.emptyCard} onPress={() => navigation.navigate("Browse")}>
                <Text style={styles.emptyText}>
                  Save providers you like and they'll show up here.
                </Text>
              </Pressable>
            ) : (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={wishlist}
                keyExtractor={(w) => w.providerId}
                contentContainerStyle={styles.carouselContent}
                renderItem={({ item, index }) => (
                  <Pressable
                    style={styles.bookingCard}
                    onPress={() =>
                      navigation.navigate("ProviderDetails", { providerId: item.providerId })
                    }
                  >
                    <View
                      style={[
                        styles.cardIcon,
                        { backgroundColor: TILE_COLORS[(index + 3) % TILE_COLORS.length] },
                      ]}
                    >
                      <Ionicons
                        name={iconFor(item.provider?.business_name || "")}
                        size={18}
                        color="#fff"
                      />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.provider?.business_name || "Provider no longer available"}
                    </Text>
                    {item.provider?.rating ? (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color={colors.primary} />
                        <Text style={styles.cardMeta}>{item.provider.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                )}
              />
            )}

            {/* Popular Categories - same curated set as Home/Browse,
                so there's always something to explore from here even
                before a customer has any bookings or wishlist items. */}
            {popularCategories.length ? (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Popular Categories</Text>
                </View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={popularCategories}
                  keyExtractor={(c) => `cat-${c.id}`}
                  contentContainerStyle={styles.carouselContent}
                  renderItem={({ item, index }) => (
                    <Pressable
                      style={styles.categoryCard}
                      onPress={() =>
                        navigation.navigate("CategoryProviders", {
                          categoryId: item.id,
                          categoryName: item.name,
                        })
                      }
                    >
                      <View
                        style={[
                          styles.cardIcon,
                          { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] },
                        ]}
                      >
                        <Ionicons name={iconFor(item.name)} size={18} color="#fff" />
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </Pressable>
                  )}
                />
              </>
            ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTapArea: { flex: 1, flexDirection: "row", alignItems: "center" },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  headerText: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 20, fontWeight: "700", color: colors.text },
  contact: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
  editHint: { color: colors.primary, marginTop: 3, fontSize: 11, fontWeight: "600" },
  quickActionsRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  quickAction: {
    alignItems: "center",
    justifyContent: "center",
    width: 84,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  quickActionLabel: { fontSize: 11, fontWeight: "700", color: colors.white, textAlign: "center" },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  sectionSeeAll: { padding: 4 },
  carouselContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  emptyCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  bookingCard: {
    width: 150,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryCard: {
    width: 96,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  cardTitle: { fontWeight: "700", color: colors.text, fontSize: 13 },
  cardSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  cardMeta: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
