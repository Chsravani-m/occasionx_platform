import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getProviderReviews, Review } from "@/features/reviews/reviewApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProviderTabParamList, ProviderStackParamList } from "@/core/navigation/types";

// Reached from Dashboard's "Reviews" quick action. Before this screen,
// a provider could only see an aggregate avg-rating/review-count stat
// on the Dashboard - the actual review text was only visible on their
// public listing in the customer app. Mirrors web-app's
// ReviewsSection.tsx (star row + comment cards), reading from the same
// GET /bookings/provider/{providerId}/reviews endpoint.

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderTabParamList>,
  NativeStackScreenProps<ProviderStackParamList, "Reviews">
>;

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          style={{ color: star <= rating ? colors.accent : colors.border, fontSize: 15 }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const { user } = useAuth();
  const providerId = (user as any)?.provider_id || user?.id;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!providerId) return;
    try {
      setError(null);
      const data = await getProviderReviews(providerId);
      setReviews(data);
    } catch {
      setError("Couldn't load your reviews.");
    }
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <LoadingView label="Loading your reviews..." />;
  if (error) return <ErrorView message={error} />;

  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Reviews</Text>
          {reviews.length > 0 && (
            <View style={styles.summary}>
              <StarRow rating={Math.round(average)} />
              <Text style={styles.summaryText}>
                {average.toFixed(1)} ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
              </Text>
            </View>
          )}
        </View>

        {reviews.length === 0 ? (
          <Text style={styles.empty}>
            No reviews yet. Once customers rate a completed booking, they'll show up here.
          </Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.customerName}>{review.customer_name || "OccasionX Customer"}</Text>
                <Text style={styles.date}>
                  {new Date(review.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>

              <View style={{ marginTop: 4 }}>
                <StarRow rating={review.rating} />
              </View>

              {!!review.service_name && <Text style={styles.serviceName}>{review.service_name}</Text>}
              {!!review.comment && <Text style={styles.comment}>{review.comment}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  summary: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  summaryText: { color: colors.textMuted, fontSize: 13 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  customerName: { fontWeight: "700", color: colors.text, fontSize: 14 },
  date: { color: colors.textMuted, fontSize: 12 },
  serviceName: { color: colors.primary, fontSize: 12, marginTop: 6 },
  comment: { color: colors.text, fontSize: 13, marginTop: 8, lineHeight: 19 },
});
