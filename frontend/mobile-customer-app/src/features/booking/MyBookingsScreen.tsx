import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getCustomerBookings, cancelBooking, Booking } from "@/features/booking/bookingApi";
import { createCombinedPaymentOrder, verifyCombinedPayment } from "@/features/payments/paymentApi";
import { canCancelBooking } from "@/features/booking/bookingRules";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import PaymentWebView, { RazorpaySuccess } from "@/core/components/PaymentWebView";
import { colors } from "@/core/theme/colors";

const STATUS_COLORS: Record<string, string> = {
  AWAITING_PAYMENT: colors.warning,
  CONFIRMED: colors.success,
  REJECTED: colors.danger,
  CANCELLED: colors.danger,
  EXPIRED: colors.textMuted,
};

// A booking can still be cancelled while it holds a date - PENDING
// (unused in practice)/AWAITING_PAYMENT/CONFIRMED - and only if the
// event itself hasn't already happened (see bookingRules.ts). The
// backend re-checks both on the actual cancel call.
function isCancellable(booking: Booking): boolean {
  if (!["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(booking.booking_status)) {
    return false;
  }
  return canCancelBooking(booking.event_date, booking.event_time);
}

export default function MyBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payment, setPayment] = useState<{
    visible: boolean;
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const data = await getCustomerBookings(user.id);
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBookings(data);
    } catch {
      setError("Couldn't load your bookings.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePayNow = async (booking: Booking) => {
    if (!user?.id) return;
    setPayingId(booking.id);
    try {
      const order = await createCombinedPaymentOrder([booking.id], {
        customerId: user.id,
        includeBookingCharge: !user.isPaidMember,
      });
      setPayment({
        visible: true,
        orderId: order.order_id,
        amount: order.amount,
        currency: order.currency,
        keyId: order.razorpay_key_id,
      });
    } catch {
      Alert.alert("Error", "Couldn't start payment. Try again.");
    } finally {
      setPayingId(null);
    }
  };

  const handlePaymentSuccess = async (result: RazorpaySuccess) => {
    setPayment(null);
    try {
      await verifyCombinedPayment({
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });
      Alert.alert("Payment successful");
      load();
    } catch {
      Alert.alert("Payment verification failed", "Check status below before retrying.");
    }
  };

  const handleCancel = (booking: Booking) => {
    Alert.alert(
      "Cancel booking?",
      `Cancel this booking for ${booking.service_name || "this service"}? This can't be undone.`,
      [
        { text: "Keep booking", style: "cancel" },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: async () => {
            setCancellingId(booking.id);
            try {
              await cancelBooking(booking.id);
              await load();
            } catch (e: any) {
              const detail = e?.response?.data?.detail;
              Alert.alert(
                "Couldn't cancel",
                typeof detail === "string" ? detail : "This booking can no longer be cancelled."
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingView label="Loading your bookings..." />;

  return (
    <Screen>
      <Text style={styles.title}>My Bookings</Text>
      {error ? <ErrorView message={error} /> : null}
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>You haven't booked anything yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.provider}>{item.provider_name}</Text>
              <Text style={[styles.status, { color: STATUS_COLORS[item.booking_status] || colors.text }]}>
                {item.booking_status.replace("_", " ")}
              </Text>
            </View>
            <Text style={styles.service}>{item.service_name}</Text>
            <Text style={styles.date}>
              Event Date: {item.event_date}
              {item.event_time ? ` at ${item.event_time}` : ""}
            </Text>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Service Provider Fee</Text>
              <Text style={styles.billValue}>₹{(item.amount ?? 0).toLocaleString("en-IN")}</Text>
            </View>
            {!!item.application_fee && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Application Fee</Text>
                <Text style={styles.billValue}>₹{item.application_fee}</Text>
              </View>
            )}

            {item.booking_status === "AWAITING_PAYMENT" && (
              <PrimaryButton
                label="Pay Now"
                onPress={() => handlePayNow(item)}
                loading={payingId === item.id}
                style={styles.payButton}
              />
            )}

            {isCancellable(item) && (
              <>
                <Text style={styles.cancelNote}>
                  This booking can be cancelled any time before the event.
                </Text>
                <PrimaryButton
                  label="Cancel Booking"
                  variant="outline"
                  onPress={() => handleCancel(item)}
                  loading={cancellingId === item.id}
                  style={styles.cancelButton}
                />
              </>
            )}
          </View>
        )}
      />

      {payment && (
        <PaymentWebView
          visible={payment.visible}
          keyId={payment.keyId}
          amount={payment.amount}
          currency={payment.currency}
          orderId={payment.orderId}
          onSuccess={handlePaymentSuccess}
          onDismiss={() => setPayment(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.text, paddingHorizontal: 20, paddingTop: 12 },
  flatList: { flex: 1 },
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
  provider: { fontWeight: "700", color: colors.text, flex: 1 },
  status: { fontWeight: "700", fontSize: 12 },
  service: { color: colors.textMuted, marginTop: 2 },
  date: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  billRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  billLabel: { color: colors.textMuted, fontSize: 13 },
  billValue: { color: colors.text, fontWeight: "500", fontSize: 13 },
  payButton: { marginTop: 12 },
  cancelNote: { color: colors.textMuted, fontSize: 11, marginTop: 10 },
  cancelButton: { marginTop: 8 },
});
