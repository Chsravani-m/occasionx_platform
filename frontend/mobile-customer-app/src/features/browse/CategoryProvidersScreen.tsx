import React, { useEffect, useState } from "react";
import { FlatList, Text, View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getProvidersByCategory, CategoryProvider } from "@/features/providers/providerApi";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import ProviderCard from "@/core/components/ProviderCard";
import { colors } from "@/core/theme/colors";
import { useLocationContext } from "@/core/context/LocationContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "CategoryProviders">;

export default function CategoryProvidersScreen({ route, navigation }: Props) {
  const { categoryId, categoryName } = route.params;
  const [providers, setProviders] = useState<CategoryProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { location, resolvedStateId, resolvedDistrictId, detectLocation } = useLocationContext();

  useEffect(() => {
    setLoading(true);
    getProvidersByCategory(categoryId, resolvedStateId ?? undefined, resolvedDistrictId ?? undefined)
      .then(setProviders)
      .catch(() => setError("Couldn't load providers for this category."))
      .finally(() => setLoading(false));
    // Re-run when the resolved location changes so switching cities
    // updates the list without needing to leave/re-enter the screen.
  }, [categoryId, resolvedStateId, resolvedDistrictId]);

  if (loading) return <LoadingView label={`Loading ${categoryName}...`} />;
  if (error) return <ErrorView message={error} />;

  return (
    <Screen>
      <Text style={styles.title}>{categoryName}</Text>

      {resolvedDistrictId ? (
        <View style={styles.locationBanner}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.locationBannerText}>Showing providers near {location?.city}</Text>
        </View>
      ) : location?.city ? (
        <Pressable style={styles.locationBanner} onPress={detectLocation}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.locationBannerText}>
            Couldn't match "{location.city}" to a service area - showing all locations. Tap to retry.
          </Text>
        </Pressable>
      ) : null}

      <FlatList
        data={providers}
        keyExtractor={(p) => p.id}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {resolvedDistrictId
              ? "No providers found near you in this category yet."
              : "No providers found in this category yet."}
          </Text>
        }
        renderItem={({ item }) => (
          <ProviderCard
            provider={item}
            onPress={() => navigation.navigate("ProviderDetails", { providerId: item.id })}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", color: colors.text, paddingHorizontal: 16, paddingTop: 12 },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  locationBannerText: { marginLeft: 6, color: colors.textMuted, fontSize: 12, flexShrink: 1 },
  flatList: { flex: 1 },
  list: { padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
});
