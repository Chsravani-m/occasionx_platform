import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getProviderBookings, updateBookingStatus, Booking } from "@/features/bookings/bookingApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";

const STATUS_COLORS: Record<string, string> = {
  AWAITING_PAYMENT: colors.warning,
  CONFIRMED: colors.success,
  REJECTED: colors.danger,
  EXPIRED: colors.textMuted,
};

export default function ProviderBookingsScreen() {
  const { user } = useAuth();
  const providerId = (user as any)?.provider_id || user?.id;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!providerId) return;
    try {
      setError(null);
      const data = await getProviderBookings(providerId);
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBookings(data);
    } catch {
      setError("Couldn't load your bookings.");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleReject = (booking: Booking) => {
    Alert.alert("Reject booking?", `Reject the booking from ${booking.customer_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          await updateBookingStatus(booking.id, "REJECTED");
          load();
        },
      },
    ]);
  };

  // Offline entries (jobs the provider logged themselves) are already
  // CONFIRMED with no payment step, so there's no "Reject" to do - but
  // the provider should still be able to remove a bad entry. Mirrors
  // web-app's provider bookings page "Cancel Entry" button, which was
  // missing here entirely (see MP-09).
  const handleCancelEntry = (booking: Booking) => {
    Alert.alert("Cancel this entry?", `Remove the offline booking for ${booking.customer_name}?`, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel Entry",
        style: "destructive",
        onPress: async () => {
          await updateBookingStatus(booking.id, "REJECTED");
          load();
        },
      },
    ]);
  };

  if (loading) return <LoadingView label="Loading bookings..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <Screen>
      <Text style={styles.title}>Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No bookings yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.customer}>{item.customer_name}</Text>
              <Text style={[styles.status, { color: STATUS_COLORS[item.booking_status] || colors.text }]}>
                {item.booking_status.replace("_", " ")}
              </Text>
            </View>
            <Text style={styles.service}>{item.service_name}</Text>
            <Text style={styles.date}>Event Date: {item.event_date}</Text>
            <Text style={styles.amount}>₹{(item.amount ?? 0).toLocaleString("en-IN")}</Text>

            {item.booking_status === "AWAITING_PAYMENT" && (
              <Pressable onPress={() => handleReject(item)}>
                <Text style={styles.reject}>Reject</Text>
              </Pressable>
            )}
            {item.source === "OFFLINE" && item.booking_status === "CONFIRMED" && (
              <Pressable onPress={() => handleCancelEntry(item)}>
                <Text style={styles.reject}>Cancel Entry</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.text, paddingHorizontal: 20, paddingTop: 12 },
  list: { padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 60 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  customer: { fontWeight: "700", color: colors.text, flex: 1 },
  status: { fontWeight: "700", fontSize: 12 },
  service: { color: colors.textMuted, marginTop: 2 },
  date: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  amount: { color: colors.primary, fontWeight: "700", marginTop: 6 },
  reject: { color: colors.danger, fontWeight: "600", marginTop: 10 },
});
