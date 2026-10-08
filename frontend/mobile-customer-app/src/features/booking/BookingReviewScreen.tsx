import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { createBooking } from "@/features/booking/bookingApi";
import { createCombinedPaymentOrder, verifyCombinedPayment } from "@/features/payments/paymentApi";
import { clearCart, itemTotal, effectiveQuantity } from "@/features/cart/cart";
import { useAuth } from "@/core/context/AuthContext";
import PaymentWebView, { RazorpaySuccess } from "@/core/components/PaymentWebView";
import { Screen, LoadingView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "BookingReview">;

const APPLICATION_FEE_PER_BOOKING = 1;

export default function BookingReviewScreen({ route, navigation }: Props) {
  const { items, fromCart } = route.params;
  const { user, isPaidMember } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<{
    visible: boolean;
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null>(null);

  const providerSubtotal = items.reduce((sum, item) => sum + itemTotal(item), 0);
  const applicationFee = isPaidMember ? 0 : items.length * APPLICATION_FEE_PER_BOOKING;
  const total = providerSubtotal + applicationFee;

  const handleConfirm = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      // Create one booking per cart item first (each stays
      // AWAITING_PAYMENT until the single combined charge below
      // succeeds - see booking-service's create_combined_order).
      const missingTime = items.find((item) => !item.event_time);
      if (missingTime) {
        Alert.alert(
          "Missing event time",
          `Please set an event time for ${missingTime.provider_name} — ${missingTime.service_name} before continuing.`
        );
        setSubmitting(false);
        return;
      }

      const bookingIds: string[] = [];
      for (const item of items) {
        const booking = await createBooking({
          customer_id: user.id,
          provider_id: item.provider_id,
          service_id: item.service_id,
          pricing_id: item.pricing_id,
          event_date: item.event_date,
          event_time: item.event_time!,
          // Accommodation (PER_DAY) items carry their check-out date +
          // room count from ProviderDetailsScreen - previously dropped
          // here entirely, so POST /bookings never saw them (MC-15).
          event_end_date: item.event_end_date,
          quantity: item.quantity,
          guest_count: effectiveQuantity(item),
          customer_name: user.fullName,
          customer_email: user.email,
          customer_phone: user.mobile,
          provider_name: item.provider_name,
          service_name: item.service_name,
          category_name: item.category_name,
          amount: itemTotal(item),
        });
        bookingIds.push(booking.id);
      }

      const order = await createCombinedPaymentOrder(bookingIds, {
        customerId: user.id,
        includeBookingCharge: !isPaidMember,
      });

      setPayment({
        visible: true,
        orderId: order.order_id,
        amount: order.amount,
        currency: order.currency,
        keyId: order.razorpay_key_id,
      });
    } catch (e: any) {
      Alert.alert(
        "Booking failed",
        e?.response?.data?.detail ||
          "One or more providers may be unavailable on the selected dates. Please review and retry."
      );
    } finally {
      setSubmitting(false);
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
      if (fromCart && user?.id) {
        await clearCart(user.id);
      }
      Alert.alert("Booking Confirmed", "All services booked and paid successfully.", [
        { text: "View My Bookings", onPress: () => navigation.navigate("MyBookings") },
      ]);
    } catch {
      Alert.alert(
        "Payment verification failed",
        "We couldn't confirm your payment. Check My Bookings before retrying."
      );
    }
  };

  const handlePaymentDismiss = () => {
    setPayment(null);
    // Cart items are intentionally left untouched here - the created
    // bookings stay AWAITING_PAYMENT and can be retried from My
    // Bookings, matching web app behavior (nothing is silently lost).
    Alert.alert(
      "Payment not completed",
      "Your bookings are saved as Awaiting Payment. Retry any time from My Bookings."
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Review Your Booking</Text>

        {items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemProvider}>
              {item.provider_name} — {item.service_name}
            </Text>
            <Text style={styles.itemPrice}>₹{itemTotal(item).toLocaleString("en-IN")}</Text>
            <Text style={styles.itemDate}>
              Event Date: {item.event_date}
              {item.event_time ? ` at ${item.event_time}` : ""}
              {item.event_end_date ? ` · Check-out: ${item.event_end_date}` : ""}
              {item.event_end_date && item.quantity ? ` · Rooms: ${item.quantity}` : ""}
            </Text>
          </View>
        ))}

        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Provider Fees Subtotal</Text>
          <Text style={styles.billValue}>₹{providerSubtotal.toLocaleString("en-IN")}</Text>
        </View>
        {applicationFee > 0 && (
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Application Fee ({items.length} services)</Text>
            <Text style={styles.billValue}>₹{applicationFee}</Text>
          </View>
        )}
        <View style={styles.billRow}>
          <Text style={styles.billTotalLabel}>Total</Text>
          <Text style={styles.billTotalValue}>₹{total.toLocaleString("en-IN")}</Text>
        </View>

        {applicationFee > 0 && (
          <Text style={styles.feeNotice}>
            Free members pay a small application fee, added automatically to the payment below.
            Upgrade to Prime to skip it.
          </Text>
        )}

        <PrimaryButton
          label="Confirm Booking"
          onPress={handleConfirm}
          loading={submitting}
          style={styles.confirmButton}
        />
      </ScrollView>

      {payment && (
        <PaymentWebView
          visible={payment.visible}
          keyId={payment.keyId}
          amount={payment.amount}
          currency={payment.currency}
          orderId={payment.orderId}
          prefillName={user?.fullName}
          prefillEmail={user?.email}
          prefillContact={user?.mobile}
          onSuccess={handlePaymentSuccess}
          onDismiss={handlePaymentDismiss}
        />
      )}

      {submitting && !payment && <LoadingView label="Creating your bookings..." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 16 },
  itemRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  itemProvider: { fontWeight: "600", color: colors.text },
  itemPrice: { color: colors.primary, fontWeight: "600", marginTop: 4 },
  itemDate: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  billRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  billLabel: { color: colors.textMuted },
  billValue: { color: colors.text, fontWeight: "500" },
  billTotalLabel: { color: colors.text, fontWeight: "700", fontSize: 17, marginTop: 8 },
  billTotalValue: { color: colors.primary, fontWeight: "700", fontSize: 17, marginTop: 8 },
  feeNotice: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  confirmButton: { marginTop: 24 },
});
