import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, DeviceEventEmitter } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getCustomerWishlist, removeFromWishlist, WishlistItem, WISHLIST_UPDATED_EVENT } from "@/features/wishlist/wishlistApi";
import { getProviderDetails, Provider } from "@/features/providers/providerApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "Wishlist">;

export default function WishlistScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [providers, setProviders] = useState<Record<string, Provider | null>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await getCustomerWishlist(user.id);
    setItems(data);
    setLoading(false);

    // Wishlist entries only store provider_id - look up each provider's
    // business_name/rating/starting_price so the list reads as "Blue Sky
    // Catering" instead of a raw UUID. A missing/deleted provider
    // resolves to null so the card can show a graceful fallback instead
    // of crashing the list.
    const entries = await Promise.all(
      data.map(async (item) => {
        try {
          const details = await getProviderDetails(item.provider_id);
          return [item.provider_id, details.provider] as const;
        } catch {
          return [item.provider_id, null] as const;
        }
      })
    );
    setProviders(Object.fromEntries(entries));
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const sub = DeviceEventEmitter.addListener(WISHLIST_UPDATED_EVENT, load);
      return () => sub.remove();
    }, [load])
  );

  if (loading) return <LoadingView />;

  const handleRemove = async (providerId: string) => {
    if (!user?.id) return;
    await removeFromWishlist(user.id, providerId);
  };

  return (
    <Screen>
      <Text style={styles.title}>Wishlist</Text>
      <FlatList
        data={items}
        keyExtractor={(w) => w.id}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Your wishlist is empty.</Text>}
        renderItem={({ item }) => {
          const provider = providers[item.provider_id];
          const notLoadedYet = !(item.provider_id in providers);
          return (
            <View style={styles.card}>
              <Pressable
                style={styles.cardBody}
                onPress={() => navigation.navigate("ProviderDetails", { providerId: item.provider_id })}
              >
                <Text style={styles.providerName}>
                  {notLoadedYet
                    ? "Loading..."
                    : provider?.business_name || "Provider no longer available"}
                </Text>
                {provider ? (
                  <View style={styles.metaRow}>
                    {provider.rating ? (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color={colors.primary} />
                        <Text style={styles.metaText}>{provider.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                    {provider.starting_price ? (
                      <Text style={styles.metaText}>
                        From ₹{provider.starting_price.toLocaleString("en-IN")}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
              <Pressable style={styles.iconButton} onPress={() => handleRemove(item.provider_id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.text, paddingHorizontal: 20, paddingTop: 12 },
  flatList: { flex: 1 },
  list: { padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 60 },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: { flex: 1 },
  providerName: { fontWeight: "600", color: colors.text, fontSize: 15 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  metaText: { marginLeft: 4, color: colors.textMuted, fontSize: 12 },
  iconButton: { marginLeft: 12 },
});
