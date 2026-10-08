import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, DeviceEventEmitter, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getCart, removeFromCart, itemTotal, CartItem, CART_UPDATED_EVENT } from "@/features/cart/cart";
import { addToWishlist } from "@/features/wishlist/wishlistApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/core/navigation/types";
import { createCollabSession } from "@/features/collab-session/collabApi";
import { setActiveCollabSession } from "@/features/collab-session/activeSession";

type Props = NativeStackScreenProps<CustomerStackParamList, "Cart">;

export default function CartScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlistBusyIndex, setWishlistBusyIndex] = useState<number | null>(null);
  const [startingSession, setStartingSession] = useState(false);

  const handlePlanTogether = async () => {
    if (!user?.id) return;
    try {
      setStartingSession(true);
      const session = await createCollabSession(user.id, user.fullName);
      const host = session.participants.find((p) => p.role === "HOST");
      if (host) {
        await setActiveCollabSession({
          sessionId: session.id,
          participantId: host.id,
          displayName: host.display_name,
        });
      }
      navigation.navigate("CollabSession", { sessionId: session.id });
    } catch (e) {
      console.error(e);
      Alert.alert("Couldn't start a group session. Please try again.");
    } finally {
      setStartingSession(false);
    }
  };

  const load = useCallback(async () => {
    if (!user?.id) return;
    const cart = await getCart(user.id);
    setItems(cart);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const sub = DeviceEventEmitter.addListener(CART_UPDATED_EVENT, load);
      return () => sub.remove();
    }, [load])
  );

  if (loading) return <LoadingView />;

  const subtotal = items.reduce((sum, item) => sum + itemTotal(item), 0);

  const handleRemove = async (index: number) => {
    if (!user?.id) return;
    await removeFromCart(user.id, index);
  };

  // Mirrors the web app's "Move to Wishlist": saves the provider to the
  // customer's wishlist, then removes this item from the cart (it's a
  // move, not a copy) - see CartPage.tsx's handleMoveToWishlist.
  const handleMoveToWishlist = async (item: CartItem, index: number) => {
    if (!user?.id) return;
    setWishlistBusyIndex(index);
    try {
      await addToWishlist(user.id, item.provider_id);
      await removeFromCart(user.id, index);
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Please try again.";
      Alert.alert(
        `Couldn't move to wishlist${e?.response?.status ? ` (${e.response.status})` : ""}`,
        typeof detail === "string" ? detail : JSON.stringify(detail)
      );
    } finally {
      setWishlistBusyIndex(null);
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your Cart</Text>
        <Pressable
          style={styles.planButton}
          onPress={handlePlanTogether}
          disabled={startingSession}
        >
          <Ionicons name="people-outline" size={16} color={colors.primary} />
          <Text style={styles.planButtonText}>
            {startingSession ? "Starting..." : "Plan with Friends"}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Your cart is empty.</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.providerName}>{item.provider_name}</Text>
            <Text style={styles.serviceName}>{item.service_name}</Text>
            <Text style={styles.date}>
              Event Date: {item.event_date}
              {item.event_time ? ` at ${item.event_time}` : ""}
              {item.event_end_date ? ` · Check-out: ${item.event_end_date}` : ""}
              {item.event_end_date && item.quantity ? ` · Rooms: ${item.quantity}` : ""}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.price}>₹{itemTotal(item).toLocaleString("en-IN")}</Text>
              <View style={styles.actions}>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => handleMoveToWishlist(item, index)}
                  disabled={wishlistBusyIndex === index}
                  hitSlop={8}
                >
                  <Ionicons
                    name="heart-outline"
                    size={20}
                    color={wishlistBusyIndex === index ? colors.textMuted : colors.primary}
                  />
                </Pressable>
                <Pressable style={styles.iconButton} onPress={() => handleRemove(index)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal ({items.length} items)</Text>
            <Text style={styles.subtotalValue}>₹{subtotal.toLocaleString("en-IN")}</Text>
          </View>
          <PrimaryButton
            label={`Continue to Booking (${items.length} services)`}
            onPress={() => navigation.navigate("BookingReview", { items, fromCart: true })}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  planButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  planButtonText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  flatList: { flex: 1 },
  list: { padding: 16, paddingBottom: 140 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 60 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerName: { fontWeight: "700", color: colors.text },
  serviceName: { color: colors.textMuted, marginTop: 2 },
  date: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  price: { fontWeight: "700", color: colors.primary },
  actions: { flexDirection: "row", alignItems: "center" },
  iconButton: { marginLeft: 16 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  subtotalLabel: { color: colors.textMuted },
  subtotalValue: { fontWeight: "700", color: colors.text },
});
