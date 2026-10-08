import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { getProviderEarnings, ProviderEarnings } from "@/features/earnings/earningsApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";

export default function EarningsScreen() {
  const { user } = useAuth();
  const providerId = (user as any)?.provider_id || user?.id;

  const [earnings, setEarnings] = useState<ProviderEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providerId) return;
    getProviderEarnings(providerId)
      .then(setEarnings)
      .catch(() => setError("Couldn't load your earnings."))
      .finally(() => setLoading(false));
  }, [providerId]);

  if (loading) return <LoadingView label="Loading earnings..." />;
  if (error || !earnings) return <ErrorView message={error || "No data"} />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Earnings</Text>
        <Text style={styles.note}>
          OccasionX takes no commission - this is your own booking revenue, paid directly by
          customers.
        </Text>

        <View style={styles.bigCard}>
          <Text style={styles.bigValue}>₹{earnings.total_earnings.toLocaleString("en-IN")}</Text>
          <Text style={styles.bigLabel}>Total Earnings ({earnings.confirmed_bookings} bookings)</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ₹{earnings.average_booking_value.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.statLabel}>Avg Booking Value</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ₹{earnings.awaiting_payment_amount.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.statLabel}>Awaiting Payment ({earnings.awaiting_payment_count})</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{earnings.offline_earnings.toLocaleString("en-IN")}</Text>
            <Text style={styles.statLabel}>Offline Earnings ({earnings.offline_bookings})</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Monthly</Text>
        {earnings.monthly.map((m) => (
          <View key={m.month} style={styles.monthRow}>
            <Text style={styles.monthLabel}>{m.month}</Text>
            <Text style={styles.monthValue}>
              ₹{m.earnings.toLocaleString("en-IN")} ({m.bookings})
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  note: { color: colors.textMuted, marginTop: 6, marginBottom: 20, fontSize: 13 },
  bigCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  bigValue: { color: colors.white, fontSize: 30, fontWeight: "800" },
  bigLabel: { color: "#DBE4FF", marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  statLabel: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 16, marginBottom: 10 },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  monthLabel: { color: colors.text },
  monthValue: { color: colors.textMuted },
});
