import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ImageBackground,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import {
  getProviderDetails,
  ProviderDetails,
  ProviderService,
  PricingPackage,
} from "@/features/providers/providerApi";
import { getCategories, Category } from "@/features/browse/catalogApi";
import { createBooking } from "@/features/booking/bookingApi";
import { createCombinedPaymentOrder, verifyCombinedPayment } from "@/features/payments/paymentApi";
import { addToWishlist, removeFromWishlist, checkWishlisted } from "@/features/wishlist/wishlistApi";
import { addToCart } from "@/features/cart/cart";
import { addCollabService } from "@/features/collab-session/collabApi";
import { getActiveCollabSession } from "@/features/collab-session/activeSession";
import {
  calculateEstimatedCost,
  calculateNumDays,
  isAccommodationService,
  isGroomingService,
  suggestedQuantityFor,
  MAX_GUESTS_PER_ROOM,
  MAX_PEOPLE_QUANTITY,
} from "@/features/providers/pricing";
import { getEarliestBookableDate, getLatestBookableDate } from "@/features/booking/bookingRules";
import { useAuth } from "@/core/context/AuthContext";
import { API_GATEWAY_URL } from "@/core/api/client";
import { TILE_COLORS, iconFor } from "@/core/utils/categoryIcons";
import PaymentWebView, { RazorpaySuccess } from "@/core/components/PaymentWebView";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CustomerStackParamList } from "@/core/navigation/types";

// Same deterministic fallback-tile convention as ProviderCard.tsx, so
// a provider without a display picture or portfolio photo still gets
// a consistent colorful hero instead of a blank box.
function fallbackColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % TILE_COLORS.length;
  return TILE_COLORS[hash];
}

type Props = NativeStackScreenProps<CustomerStackParamList, "ProviderDetails">;

function isPerUnit(pricingType: string) {
  return pricingType === "PER_PLATE" || pricingType === "PER_PERSON";
}

function clampQuantity(qty: number, pkg?: PricingPackage) {
  let q = qty;
  if (pkg?.min_quantity && q < pkg.min_quantity) q = pkg.min_quantity;
  if (pkg?.max_quantity && q > pkg.max_quantity) q = pkg.max_quantity;
  return q;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Plain-CSS styling for the web-only <input type="date"/"time"> fallback
// below - kept separate from the RN StyleSheet since these are real DOM
// nodes (react-native-web renders string tags straight to the DOM), not
// RN View/Text primitives.
const webInputStyle = {
  fontSize: 16,
  padding: 10,
  border: "1px solid #ccc",
  borderRadius: 8,
  width: "100%",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
};

export default function ProviderDetailsScreen({ route, navigation }: Props) {
  const { providerId } = route.params;
  const { user, isPaidMember } = useAuth();

  const [details, setDetails] = useState<ProviderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});

  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(null);

  // "Add to Group Session" - only usable when this device is inside an
  // active "plan together" session (see features/collab-session).
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [addingToSession, setAddingToSession] = useState(false);
  const [addedToSession, setAddedToSession] = useState(false);

  useEffect(() => {
    getActiveCollabSession().then((s) => setActiveSessionId(s?.sessionId ?? null));
  }, []);
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventTime, setEventTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [guestCount, setGuestCount] = useState("1");
  // Check-out date + room count, only used for Accommodation (PER_DAY)
  // services - previously missing entirely, so POST /bookings never
  // got event_end_date/quantity and Accommodation stays priced/booked
  // wrong (see MC-15).
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [wishlisted, setWishlisted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [payment, setPayment] = useState<{
    visible: boolean;
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    bookingId: string;
  } | null>(null);

  useEffect(() => {
    getProviderDetails(providerId)
      .then(setDetails)
      .catch(() => setError("Couldn't load this provider's details."))
      .finally(() => setLoading(false));

    if (user?.id) {
      checkWishlisted(user.id, providerId).then(setWishlisted).catch(() => {});
    }

    getCategories()
      .then((cats: Category[]) => {
        const map: Record<string, string> = {};
        cats.forEach((c) => {
          map[c.id] = c.name;
        });
        setCategoryNames(map);
      })
      .catch(() => {});
  }, [providerId, user?.id]);

  // Auto-suggest room count from guest count + this package's
  // occupancy_per_room, same as the web app - the customer can still
  // edit it afterward. Declared before the loading/error early-returns
  // below so hook order stays stable across renders (Rules of Hooks).
  useEffect(() => {
    const categoryName = selectedService?.category_id
      ? categoryNames[selectedService.category_id]
      : undefined;

    const accommodation = isAccommodationService({
      pricing_type: selectedPackage?.pricing_type,
      category_name: categoryName,
    });

    if (!accommodation) return;

    const guests = parseInt(guestCount, 10) || 1;

    setQuantity(
      suggestedQuantityFor(
        categoryName,
        guests,
        selectedPackage?.occupancy_per_room,
        selectedPackage?.min_quantity
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackage?.id, guestCount]);

  if (loading) return <LoadingView label="Loading provider..." />;
  if (error || !details) return <ErrorView message={error || "Not found"} />;

  const selectedCategoryName = selectedService?.category_id
    ? categoryNames[selectedService.category_id]
    : undefined;

  const guests = parseInt(guestCount, 10) || 1;
  const effectiveQty = isPerUnit(selectedPackage?.pricing_type || "")
    ? clampQuantity(guests, selectedPackage || undefined)
    : 1;

  const isAccommodation = isAccommodationService({
    pricing_type: selectedPackage?.pricing_type,
    category_name: selectedCategoryName,
  });
  const isGroomingCategory = isGroomingService({
    pricing_type: selectedPackage?.pricing_type,
    category_name: selectedCategoryName,
  });

  const eventDateKey = eventDate.toISOString().slice(0, 10);
  const endDateKey = endDate ? endDate.toISOString().slice(0, 10) : undefined;

  const packageTotal = selectedPackage
    ? isAccommodation
      ? calculateEstimatedCost(
          selectedPackage.amount,
          selectedPackage.pricing_type,
          guests,
          selectedPackage.min_quantity,
          selectedPackage.max_quantity,
          calculateNumDays(eventDateKey, endDateKey),
          quantity
        )
      : isPerUnit(selectedPackage.pricing_type)
      ? selectedPackage.amount * effectiveQty
      : selectedPackage.amount
    : 0;

  // Free members get a small OX Application Fee folded into the same
  // combined payment - paid members skip it entirely. Same rule as
  // the web app (utils/bookingCharge.ts / isPaidMember()).
  const applicationFee = !isPaidMember && selectedPackage ? 99 : 0;
  const total = packageTotal + applicationFee;

  const toggleWishlist = async () => {
    if (!user?.id) return;
    try {
      if (wishlisted) {
        await removeFromWishlist(user.id, providerId);
        setWishlisted(false);
      } else {
        await addToWishlist(user.id, providerId);
        setWishlisted(true);
      }
    } catch {
      Alert.alert("Error", "Couldn't update your wishlist right now.");
    }
  };

  // Display picture wins if the provider set one; otherwise fall back
  // to the cover image / logo uploaded during registration's
  // "Business Photos & Video" step, then their first portfolio photo,
  // then a colored icon tile below.
  const coverPath =
    details.provider.display_picture_url ||
    details.provider.cover_image_url ||
    details.provider.logo_url ||
    details.portfolio.find((item) => item.media_type === "IMAGE")?.media_url;
  const heroImageUrl = coverPath
    ? coverPath.startsWith("http")
      ? coverPath
      : `${API_GATEWAY_URL}${coverPath}`
    : undefined;

  const heroContent = (
    <>
      <Pressable style={styles.heroWishlist} onPress={toggleWishlist} hitSlop={8}>
        <Ionicons
          name={wishlisted ? "heart" : "heart-outline"}
          size={22}
          color={wishlisted ? colors.danger : colors.white}
        />
      </Pressable>
      <View style={styles.heroTextBlock}>
        <Text style={styles.heroName}>{details.provider.business_name}</Text>
        <Text style={styles.heroOwner}>by {details.provider.owner_name}</Text>
        <Text style={styles.heroRating}>
          ⭐ {details.rating?.toFixed(2) ?? "New"} ({details.review_count} reviews)
        </Text>
      </View>
    </>
  );

  // Shared by both Add to Cart and Book Now - Accommodation stays need
  // a check-out date, and can't be booked for more guests than the
  // chosen room count can hold (same MAX_GUESTS_PER_ROOM cap the web
  // app enforces).
  const validateAccommodation = (): boolean => {
    if (!isAccommodation) return true;

    if (!endDateKey) {
      Alert.alert("Select a check-out date for this stay.");
      return false;
    }

    if (endDateKey < eventDateKey) {
      Alert.alert("Check-out date can't be before the check-in date.");
      return false;
    }

    if (guests > quantity * MAX_GUESTS_PER_ROOM) {
      Alert.alert(
        "Too many guests for the rooms selected",
        `No more than ${MAX_GUESTS_PER_ROOM} guests per room. Increase Rooms to fit ${guests} guests.`
      );
      return false;
    }

    return true;
  };

  const handleAddToCart = async () => {
    if (!user?.id || !selectedService || !selectedPackage) {
      Alert.alert("Select a service and package first.");
      return;
    }
    if (!eventTime) {
      Alert.alert("Select an event time first.");
      return;
    }
    if (!validateAccommodation()) return;

    await addToCart(user.id, {
      provider_id: providerId,
      provider_name: details.provider.business_name,
      service_id: selectedService.id,
      service_name: selectedService.name,
      pricing_id: selectedPackage.id,
      pricing_type: selectedPackage.pricing_type,
      price: selectedPackage.amount,
      unit: selectedPackage.unit,
      category_id: selectedService.category_id,
      category_name: selectedCategoryName,
      event_date: eventDateKey,
      event_time: formatTime(eventTime),
      guest_count: guests,
      min_quantity: selectedPackage.min_quantity,
      max_quantity: selectedPackage.max_quantity,
      occupancy_per_room: selectedPackage.occupancy_per_room,
      total_rooms: selectedPackage.total_rooms,
      event_end_date: isAccommodation ? endDateKey : undefined,
      quantity: isAccommodation || isGroomingCategory ? quantity : undefined,
    });
    Alert.alert("Added to Cart", "You can review it any time from the Cart tab.");
  };

  const handleBookNowAndPay = async () => {
    if (!user?.id || !selectedService || !selectedPackage) {
      Alert.alert("Select a service and package first.");
      return;
    }
    if (!eventTime) {
      Alert.alert("Select an event time first.");
      return;
    }
    if (!validateAccommodation()) return;

    setSubmitting(true);
    try {
      const booking = await createBooking({
        customer_id: user.id,
        provider_id: providerId,
        service_id: selectedService.id,
        pricing_id: selectedPackage.id,
        event_date: eventDateKey,
        event_time: formatTime(eventTime),
        event_end_date: isAccommodation ? endDateKey : undefined,
        quantity: isAccommodation || isGroomingCategory ? quantity : undefined,
        guest_count: guests,
        notes,
        customer_name: user.fullName,
        customer_email: user.email,
        customer_phone: user.mobile,
        provider_name: details.provider.business_name,
        service_name: selectedService.name,
        category_name: selectedCategoryName,
        amount: packageTotal,
      });

      // Same combined-order endpoint the cart/retry flow uses, with a
      // single booking id, so the OX application fee for free-plan
      // customers is folded into this ONE payment instead of a
      // separate popup beforehand - see paymentApi.ts.
      const order = await createCombinedPaymentOrder([booking.id], {
        customerId: user.id,
        includeBookingCharge: !isPaidMember,
      });

      setPayment({
        visible: true,
        orderId: order.order_id,
        amount: order.amount,
        currency: order.currency,
        keyId: order.razorpay_key_id,
        bookingId: booking.id,
      });
    } catch (e: any) {
      Alert.alert(
        "Booking failed",
        e?.response?.data?.detail || "Something went wrong creating your booking."
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
      Alert.alert("Booking Confirmed", "Your payment was successful.", [
        { text: "View My Bookings", onPress: () => navigation.navigate("MyBookings") },
      ]);
    } catch {
      Alert.alert(
        "Payment verification failed",
        "We couldn't confirm your payment. Check My Bookings - if it's still Awaiting Payment, contact support."
      );
    }
  };

  const handlePaymentDismiss = () => {
    setPayment(null);
    Alert.alert(
      "Payment not completed",
      "Your booking is saved as Awaiting Payment. You can pay any time from My Bookings."
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {heroImageUrl ? (
          <ImageBackground source={{ uri: heroImageUrl }} style={styles.hero} resizeMode="cover">
            <View style={styles.heroScrim} />
            {heroContent}
          </ImageBackground>
        ) : (
          <View style={[styles.hero, styles.heroFallback, { backgroundColor: fallbackColor(details.provider.id) }]}>
            <Ionicons
              name={iconFor(details.provider.business_name)}
              size={64}
              color="rgba(255,255,255,0.35)"
              style={styles.heroFallbackIcon}
            />
            <View style={styles.heroScrim} />
            {heroContent}
          </View>
        )}

        <View style={styles.container}>
          {details.provider.address ? (
            <Text style={styles.address}>{details.provider.address}</Text>
          ) : null}

          <Text style={styles.sectionTitle}>Services</Text>
        {details.services.map((service) => (
          <Pressable
            key={service.id}
            style={[styles.serviceRow, selectedService?.id === service.id && styles.serviceRowActive]}
            onPress={() => {
              setSelectedService(service);
              setSelectedPackage(null);
            }}
          >
            <Text style={styles.serviceName}>{service.name}</Text>
          </Pressable>
        ))}

        {selectedService ? (
          <>
            <Text style={styles.sectionTitle}>Packages</Text>
            {selectedService.pricing.map((pkg) => (
              <Pressable
                key={pkg.id}
                style={[styles.pkgRow, selectedPackage?.id === pkg.id && styles.pkgRowActive]}
                onPress={() => setSelectedPackage(pkg)}
              >
                <Text style={styles.pkgType}>{pkg.pricing_type.replace("_", " ")}</Text>
                <Text style={styles.pkgAmount}>
                  ₹{pkg.amount.toLocaleString("en-IN")}
                  {pkg.unit ? ` / ${pkg.unit}` : ""}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {selectedPackage ? (
          <View style={styles.bookingCard}>
            <Text style={styles.sectionTitle}>Booking Details</Text>

            <Text style={styles.label}>Event Date</Text>
            {Platform.OS === "web" ? (
              // @react-native-community/datetimepicker ships no web
              // implementation (its generic fallback just renders null +
              // console.warns "not supported on: web"), which silently
              // made this field permanently stuck open/unusable under
              // `expo start --web` - falls back to a plain HTML date
              // input on web only; native platforms are untouched below.
              React.createElement("input", {
                type: "date",
                value: eventDate.toISOString().slice(0, 10),
                min: getEarliestBookableDate().toISOString().slice(0, 10),
                max: getLatestBookableDate().toISOString().slice(0, 10),
                onChange: (e: any) => {
                  const v = e.target.value;
                  if (v) setEventDate(new Date(`${v}T00:00:00`));
                },
                style: webInputStyle,
              })
            ) : (
              <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <Text>{eventDate.toISOString().slice(0, 10)}</Text>
              </Pressable>
            )}
            {showDatePicker && Platform.OS !== "web" && (
              <DateTimePicker
                value={eventDate}
                mode="date"
                minimumDate={getEarliestBookableDate()}
                maximumDate={getLatestBookableDate()}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setEventDate(date);
                }}
              />
            )}

            <Text style={styles.label}>Event Time</Text>
            {Platform.OS === "web" ? (
              React.createElement("input", {
                type: "time",
                value: eventTime
                  ? `${String(eventTime.getHours()).padStart(2, "0")}:${String(
                      eventTime.getMinutes()
                    ).padStart(2, "0")}`
                  : "",
                onChange: (e: any) => {
                  const v = e.target.value;
                  if (v) {
                    const [h, m] = v.split(":").map(Number);
                    const d = new Date();
                    d.setHours(h, m, 0, 0);
                    setEventTime(d);
                  }
                },
                style: webInputStyle,
              })
            ) : (
              <Pressable style={styles.dateInput} onPress={() => setShowTimePicker(true)}>
                <Text>{eventTime ? formatTime(eventTime) : "Select a time"}</Text>
              </Pressable>
            )}
            {showTimePicker && Platform.OS !== "web" && (
              <DateTimePicker
                value={eventTime || new Date()}
                mode="time"
                onChange={(_, time) => {
                  setShowTimePicker(Platform.OS === "ios");
                  if (time) setEventTime(time);
                }}
              />
            )}
            {typeof details.provider.booking_notice_hours === "number" && (
              <Text style={styles.noticeHint}>
                This provider needs at least {details.provider.booking_notice_hours}{" "}
                hour(s) notice before the event.
              </Text>
            )}

            {isAccommodation && (
              <>
                <Text style={styles.label}>Check-out Date</Text>
                {Platform.OS === "web" ? (
                  React.createElement("input", {
                    type: "date",
                    value: endDateKey || "",
                    min: eventDateKey,
                    max: getLatestBookableDate().toISOString().slice(0, 10),
                    onChange: (e: any) => {
                      const v = e.target.value;
                      if (v) setEndDate(new Date(`${v}T00:00:00`));
                    },
                    style: webInputStyle,
                  })
                ) : (
                  <Pressable style={styles.dateInput} onPress={() => setShowEndDatePicker(true)}>
                    <Text>{endDateKey || "Select a check-out date"}</Text>
                  </Pressable>
                )}
                {showEndDatePicker && Platform.OS !== "web" && (
                  <DateTimePicker
                    value={endDate || eventDate}
                    mode="date"
                    minimumDate={eventDate}
                    maximumDate={getLatestBookableDate()}
                    onChange={(_, date) => {
                      setShowEndDatePicker(Platform.OS === "ios");
                      if (date) setEndDate(date);
                    }}
                  />
                )}
              </>
            )}

            {(isPerUnit(selectedPackage.pricing_type) || isAccommodation) && (
              <>
                <Text style={styles.label}>Guests</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={guestCount}
                  onChangeText={(v) => {
                    if (!isGroomingCategory) {
                      setGuestCount(v);
                      return;
                    }
                    // Grooming/Makeup only ever covers a handful of
                    // people, unlike Accommodation which should scale
                    // with a large guest list - cap it the same way
                    // the web app does.
                    const capped = Math.min(MAX_PEOPLE_QUANTITY, Math.max(1, parseInt(v, 10) || 1));
                    setGuestCount(String(capped));
                  }}
                />
              </>
            )}

            {isAccommodation && (
              <>
                <Text style={styles.label}>Rooms</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={String(quantity)}
                  onChangeText={(v) => setQuantity(Math.max(1, parseInt(v, 10) || 1))}
                />
                <Text style={styles.noticeHint}>
                  Auto-suggested from guest count (max {MAX_GUESTS_PER_ROOM} guests per room) -
                  adjust if needed.
                  {selectedPackage.total_rooms ? ` ${selectedPackage.total_rooms} room(s) available.` : ""}
                </Text>
              </>
            )}

            <Text style={styles.label}>Special Requests (optional)</Text>
            <TextInput style={styles.input} value={notes} onChangeText={setNotes} multiline />

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Package</Text>
              <Text style={styles.billValue}>₹{packageTotal.toLocaleString("en-IN")}</Text>
            </View>
            {applicationFee > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Application Fee</Text>
                <Text style={styles.billValue}>₹{applicationFee}</Text>
              </View>
            )}
            <View style={styles.billRow}>
              <Text style={styles.billTotalLabel}>Total</Text>
              <Text style={styles.billTotalValue}>₹{total.toLocaleString("en-IN")}</Text>
            </View>

            {applicationFee > 0 && (
              <Text style={styles.feeNotice}>
                Free members pay a small application fee, added automatically to the payment
                below. Upgrade to Prime to skip it.
              </Text>
            )}

            {details.provider.cancellation_policy && (
              <View style={styles.policyBox}>
                <Text style={styles.policyTitle}>Cancellation Policy</Text>
                <Text style={styles.policyText}>{details.provider.cancellation_policy}</Text>
              </View>
            )}

            <PrimaryButton
              label="Book Now & Pay"
              onPress={handleBookNowAndPay}
              loading={submitting}
              style={styles.actionButton}
            />
            <PrimaryButton
              label="Add to Cart"
              onPress={handleAddToCart}
              variant="outline"
              style={styles.actionButton}
            />
            {activeSessionId && (
              <PrimaryButton
                label={
                  addingToSession
                    ? "Adding..."
                    : addedToSession
                      ? "Added to Group Session"
                      : "Add to Group Session"
                }
                onPress={async () => {
                  const active = await getActiveCollabSession();
                  if (!active) return;
                  try {
                    setAddingToSession(true);
                    await addCollabService(
                      active.sessionId,
                      active.participantId,
                      providerId,
                      details.provider.business_name,
                      selectedCategoryName,
                      selectedService?.id
                    );
                    setAddedToSession(true);
                  } catch (e) {
                    console.error(e);
                    Alert.alert("Couldn't add this to the group session.");
                  } finally {
                    setAddingToSession(false);
                  }
                }}
                variant="outline"
                disabled={addingToSession}
                style={styles.actionButton}
              />
            )}
          </View>
          ) : null}
        </View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 60 },
  container: { padding: 20 },
  // Hero background behind the business name - display picture if the
  // provider set one, else their first portfolio photo, else a
  // colored icon tile (see heroImageUrl/fallbackColor above).
  hero: { height: 200, justifyContent: "flex-end" },
  heroFallback: { alignItems: "center", justifyContent: "flex-end" },
  heroFallbackIcon: { position: "absolute", top: "50%", marginTop: -32, alignSelf: "center" },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  heroWishlist: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextBlock: { padding: 20 },
  heroName: { fontSize: 22, fontWeight: "700", color: colors.white },
  heroOwner: { color: "rgba(255,255,255,0.85)", marginTop: 2 },
  heroRating: { marginTop: 4, color: colors.white },
  address: { marginTop: 4, color: colors.textMuted },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 10 },
  serviceRow: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  serviceRowActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  serviceName: { fontWeight: "600", color: colors.text },
  pkgRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  pkgRowActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  pkgType: { fontWeight: "600", color: colors.text },
  pkgAmount: { color: colors.primary, fontWeight: "600" },
  bookingCard: { marginTop: 8 },
  label: { color: colors.text, fontWeight: "500", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  billLabel: { color: colors.textMuted },
  billValue: { color: colors.text, fontWeight: "500" },
  billTotalLabel: { color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 6 },
  billTotalValue: { color: colors.primary, fontWeight: "700", fontSize: 16, marginTop: 6 },
  feeNotice: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  noticeHint: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  policyBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  policyTitle: { fontWeight: "600", color: colors.text, fontSize: 13 },
  policyText: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  actionButton: { marginTop: 14 },
});
