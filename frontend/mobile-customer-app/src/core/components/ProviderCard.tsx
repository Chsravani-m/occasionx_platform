import React from "react";
import { Pressable, View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/core/theme/colors";
import { API_GATEWAY_URL } from "@/core/api/client";
import { TILE_COLORS, iconFor } from "@/core/utils/categoryIcons";
import type { CategoryProvider } from "@/features/providers/providerApi";

interface Props {
  provider: CategoryProvider;
  onPress: () => void;
}

// Same fallback treatment as Home/Browse/Profile when a provider hasn't
// uploaded a portfolio photo yet - a colored tile with a keyword-matched
// icon, picked deterministically off the provider id so the same card
// always gets the same color instead of shifting on every re-render.
function fallbackColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % TILE_COLORS.length;
  return TILE_COLORS[hash];
}

export default function ProviderCard({ provider, onPress }: Props) {
  const cheapest = provider.pricing.length
    ? Math.min(...provider.pricing.map((p) => p.amount))
    : undefined;

  const imageUrl = provider.cover_image
    ? provider.cover_image.startsWith("http")
      ? provider.cover_image
      : `${API_GATEWAY_URL}${provider.cover_image}`
    : undefined;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.photoFallback, { backgroundColor: fallbackColor(provider.id) }]}>
          <Ionicons name={iconFor(provider.business_name)} size={32} color={colors.white} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {provider.business_name}
        </Text>
        <Text style={styles.price}>
          {cheapest !== undefined ? `Starting from ₹${cheapest.toLocaleString("en-IN")}` : "Contact for pricing"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  photo: { width: "100%", height: 140 },
  photoFallback: { alignItems: "center", justifyContent: "center" },
  body: { padding: 16 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  price: { marginTop: 6, color: colors.primary, fontWeight: "500" },
});
