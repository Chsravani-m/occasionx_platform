import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Modal,
  Linking,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getBlockedDates,
  createBlockedDate,
  deleteBlockedDate,
  BlockedDate,
} from "@/features/calendar/providerBlockedDateApi";
import { getProviderServices, ProviderService } from "@/features/services/providerServiceApi";
import { getProviderDashboard } from "@/features/dashboard/providerApi";
import {
  getProviderBookings,
  createOfflineBooking,
  formatBookingDates,
  Booking,
  OfflineBookingPayload,
} from "@/features/bookings/bookingApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";

// Full "Availability" calendar, ported from web-app/app/provider/
// blocked_dates/page.tsx: a month grid across every service (green =
// open, red = has a booking or manual block), tap an open day to log
// an offline booking (which blocks it, same as a real one), tap a
// blocked day to see what's booked. The existing block-a-period form
// and blocked-periods list (this screen's old sole purpose) stay below
// it unchanged.
const ACTIVE_BOOKING_STATUSES = new Set(["PENDING", "AWAITING_PAYMENT", "CONFIRMED"]);
const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Other"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

// @react-native-community/datetimepicker ships no web implementation
// (its generic fallback just renders null + console.warns "not
// supported on: web"), which made every date field on this screen
// permanently stuck on "Select date" under `expo start --web` -
// falls back to a plain HTML date input on web only; native platforms
// keep using the real DateTimePicker below untouched.
const webInputStyle = {
  fontSize: 16,
  padding: 10,
  border: "1px solid #ccc",
  borderRadius: 8,
  width: "100%",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
};

function bookingStatusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
      return colors.success;
    case "AWAITING_PAYMENT":
      return colors.warning;
    default:
      return colors.textMuted;
  }
}

const emptyOfflineForm = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  serviceName: "",
  endDate: "",
  paymentDate: "",
  amount: "",
  paymentMethod: "Cash",
  paymentType: "FULL" as "FULL" | "ADVANCE",
  amountPaid: "",
  guestCount: "",
  notes: "",
};

export default function CalendarScreen() {
  const { user } = useAuth();
  const providerId = (user as any)?.provider_id || user?.id;

  // ---- Booking calendar state ----
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [seller, setSeller] = useState<{ business_name: string; email?: string; phone?: string } | null>(null);

  // Manual blocked periods across every service - colors the calendar
  // red even for dates blocked by hand rather than by a booking.
  const [allBlockedRanges, setAllBlockedRanges] = useState<BlockedDate[]>([]);

  // ---- Offline booking modal state ----
  const [offlineDateKey, setOfflineDateKey] = useState<string | null>(null);
  const [offlineForm, setOfflineForm] = useState(emptyOfflineForm);
  const [submittingOffline, setSubmittingOffline] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [billBooking, setBillBooking] = useState<Booking | null>(null);

  // ---- Block-a-period form state (unchanged from before) ----
  const [services, setServices] = useState<ProviderService[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [blockedFrom, setBlockedFrom] = useState<Date | null>(null);
  const [blockedTo, setBlockedTo] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [reason, setReason] = useState("");
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());

  const loadBlockedDates = useCallback(async (serviceId: string) => {
    if (!serviceId) {
      setBlockedDates([]);
      return;
    }
    try {
      setBlockedDates(await getBlockedDates(serviceId));
    } catch {
      setBlockedDates([]);
    }
  }, []);

  const load = useCallback(async () => {
    if (!providerId) return;
    try {
      setError(null);
      const [bks, svc, dash] = await Promise.all([
        getProviderBookings(providerId),
        getProviderServices(providerId),
        getProviderDashboard(providerId).catch(() => null),
      ]);
      setBookings(bks.filter((b) => ACTIVE_BOOKING_STATUSES.has(b.booking_status)));
      setServices(svc);
      if (dash) {
        setSeller({ business_name: dash.business_name, email: dash.email, phone: dash.phone });
      }

      const firstId = svc[0]?.id || "";
      setSelectedService((prev) => prev || firstId);
      await loadBlockedDates(selectedService || firstId);

      const rangesPerService = await Promise.all(
        svc.map((s: ProviderService) => getBlockedDates(s.id).catch(() => []))
      );
      setAllBlockedRanges(rangesPerService.flat());
    } catch {
      setError("Couldn't load your calendar.");
    } finally {
      setBookingsLoading(false);
    }
  }, [providerId, loadBlockedDates, selectedService]);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providerId])
  );

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach((booking) => {
      const start = new Date(booking.event_date);
      const end = booking.event_end_date ? new Date(booking.event_end_date) : start;
      const cur = new Date(start);
      while (cur <= end) {
        const key = toDateKey(cur);
        const list = map.get(key) || [];
        list.push(booking);
        map.set(key, list);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [bookings]);

  const blockedRangeDates = useMemo(() => {
    const set = new Set<string>();
    allBlockedRanges.forEach((range) => {
      const start = new Date(range.blocked_from);
      const end = new Date(range.blocked_to);
      const cur = new Date(start);
      while (cur <= end) {
        set.add(toDateKey(cur));
        cur.setDate(cur.getDate() + 1);
      }
    });
    return set;
  }, [allBlockedRanges]);

  const calendarYear = cursor.getFullYear();
  const calendarMonth = cursor.getMonth();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarCells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(calendarYear, calendarMonth, i + 1)),
  ];
  const selectedBookings = selectedKey ? bookingsByDate.get(selectedKey) || [] : [];

  const onSelectService = async (id: string) => {
    setSelectedService(id);
    await loadBlockedDates(id);
  };

  const handleCreate = async () => {
    if (!selectedService || !blockedFrom || !blockedTo) {
      Alert.alert("Please select a service and both dates");
      return;
    }
    if (blockedTo < blockedFrom) {
      Alert.alert("End date can't be before the start date");
      return;
    }
    try {
      setSaving(true);
      await createBlockedDate(selectedService, {
        blocked_from: toDateKey(blockedFrom),
        blocked_to: toDateKey(blockedTo),
        reason: reason.trim() || undefined,
      });
      setBlockedFrom(null);
      setBlockedTo(null);
      setReason("");
      await loadBlockedDates(selectedService);
      await load();
    } catch {
      Alert.alert("Couldn't block those dates", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (blocked: BlockedDate) => {
    Alert.alert("Unblock these dates?", `${blocked.blocked_from} to ${blocked.blocked_to}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBlockedDate(blocked.id);
            await loadBlockedDates(selectedService);
            await load();
          } catch {
            Alert.alert("Couldn't unblock this period. Please try again.");
          }
        },
      },
    ]);
  };

  const openOfflineForm = (key: string) => {
    setOfflineDateKey(key);
    setOfflineForm(emptyOfflineForm);
  };

  const handleCreateOffline = async () => {
    if (!offlineDateKey || !providerId) return;

    if (!offlineForm.customerName || !offlineForm.customerPhone || !offlineForm.serviceName || !offlineForm.amount) {
      Alert.alert("Missing details", "Customer name, phone, service description and amount are required.");
      return;
    }
    if (Number(offlineForm.amount) <= 0) {
      Alert.alert("Amount must be greater than zero.");
      return;
    }
    if (offlineForm.paymentType === "ADVANCE" && Number(offlineForm.amountPaid) > Number(offlineForm.amount)) {
      Alert.alert("Advance paid can't be more than the total amount.");
      return;
    }

    const payload: OfflineBookingPayload = {
      customer_name: offlineForm.customerName,
      customer_phone: offlineForm.customerPhone,
      customer_email: offlineForm.customerEmail || undefined,
      service_name: offlineForm.serviceName,
      event_date: offlineDateKey,
      event_end_date: offlineForm.endDate || undefined,
      payment_date: offlineForm.paymentDate || undefined,
      amount: Number(offlineForm.amount),
      payment_method: offlineForm.paymentMethod || undefined,
      payment_type: offlineForm.paymentType,
      amount_paid:
        offlineForm.paymentType === "ADVANCE" && offlineForm.amountPaid
          ? Number(offlineForm.amountPaid)
          : undefined,
      guest_count: offlineForm.guestCount ? Number(offlineForm.guestCount) : undefined,
      notes: offlineForm.notes || undefined,
    };

    try {
      setSubmittingOffline(true);
      const created = await createOfflineBooking(providerId, payload);
      setOfflineForm(emptyOfflineForm);
      setOfflineDateKey(null);
      setBillBooking(created);
      await load();
    } catch {
      Alert.alert("Couldn't save this booking", "Please try again.");
    } finally {
      setSubmittingOffline(false);
    }
  };

  const shareBillEmail = (booking: Booking) => {
    const sellerName = seller?.business_name || "OccasionX Provider";
    const total = (booking.amount ?? 0).toLocaleString("en-IN");
    const body = [
      `Hi ${booking.customer_name || ""},`,
      "",
      `Here is your bill for ${booking.service_name || "the service"} on ${formatBookingDates(booking)}.`,
      "",
      `Total: Rs. ${total}`,
      "",
      "Thank you,",
      sellerName,
    ].join("\n");
    const url = `mailto:${booking.customer_email || ""}?subject=${encodeURIComponent(
      "Bill from " + sellerName
    )}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => Alert.alert("Couldn't open your email app."));
  };

  const shareBillWhatsapp = (booking: Booking) => {
    const sellerName = seller?.business_name || "OccasionX";
    const phone = (booking.customer_phone || "").replace(/\D/g, "");
    const total = (booking.amount ?? 0).toLocaleString("en-IN");
    const text = `Hi ${booking.customer_name || ""}, here is your bill from ${sellerName} for ${
      booking.service_name || "the service"
    } on ${formatBookingDates(booking)}. Total: Rs. ${total}. Thank you!`;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`).catch(() =>
      Alert.alert("Couldn't open WhatsApp.")
    );
  };

  if (bookingsLoading) return <LoadingView label="Loading your calendar..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>
          See every booked date across all your services, and log offline jobs or mark dates unavailable.
        </Text>

        {/* Booking calendar */}
        <View style={styles.card}>
          <View style={styles.monthRow}>
            <Pressable
              style={styles.monthNavButton}
              onPress={() => setCursor(new Date(calendarYear, calendarMonth - 1, 1))}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[calendarMonth]} {calendarYear}
            </Text>
            <Pressable
              style={styles.monthNavButton}
              onPress={() => setCursor(new Date(calendarYear, calendarMonth + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekdayLabel}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarCells.map((date, index) => {
              if (!date) return <View key={`blank-${index}`} style={styles.cell} />;
              const key = toDateKey(date);
              const dayBookings = bookingsByDate.get(key) || [];
              const hasBookings = dayBookings.length > 0;
              const isManuallyBlocked = blockedRangeDates.has(key);
              const isBlocked = hasBookings || isManuallyBlocked;
              const isSelected = selectedKey === key;
              const isPast = key < todayKey;

              return (
                <Pressable
                  key={key}
                  disabled={isPast}
                  onPress={() => {
                    if (isBlocked) {
                      setSelectedKey(isSelected ? null : key);
                    } else {
                      openOfflineForm(key);
                    }
                  }}
                  style={[
                    styles.cell,
                    styles.dayCell,
                    isPast
                      ? styles.dayPast
                      : isSelected
                      ? styles.daySelected
                      : isBlocked
                      ? styles.dayBlocked
                      : styles.dayOpen,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isPast && styles.dayTextPast,
                      isSelected && styles.dayTextSelected,
                      !isPast && !isSelected && isBlocked && styles.dayTextBlocked,
                      !isPast && !isSelected && !isBlocked && styles.dayTextOpen,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {isBlocked && !isPast && (
                    <View style={[styles.dayDot, isSelected && styles.dayDotSelected]} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.dayOpen]} />
              <Text style={styles.legendText}>Open - tap to log an offline booking</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.dayBlocked]} />
              <Text style={styles.legendText}>Blocked - has a booking or manual block</Text>
            </View>
          </View>
        </View>

        {/* Selected day's bookings */}
        {selectedKey && (
          <View style={{ marginTop: 4 }}>
            <Text style={styles.sectionTitle}>Bookings on {selectedKey}</Text>
            {selectedBookings.length === 0 ? (
              <Text style={styles.empty}>No bookings on this date.</Text>
            ) : (
              selectedBookings.map((booking) => (
                <View key={booking.id} style={styles.bookingDetailCard}>
                  <View style={styles.bookingDetailHeader}>
                    <Text style={styles.bookingDetailTitle} numberOfLines={2}>
                      {booking.service_name || "Service"}
                      {booking.package_name ? ` — ${booking.package_name}` : ""}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: bookingStatusColor(booking.booking_status) },
                      ]}
                    >
                      <Text style={styles.statusPillText}>{booking.booking_status.replace("_", " ")}</Text>
                    </View>
                  </View>
                  <Text style={styles.bookingDetailMeta}>{formatBookingDates(booking)}</Text>
                  <Text style={styles.bookingDetailRow}>Customer: {booking.customer_name || "-"}</Text>
                  {!!booking.customer_phone && (
                    <Text style={styles.bookingDetailRow}>Phone: {booking.customer_phone}</Text>
                  )}
                  <Text style={styles.bookingDetailRow}>Guests: {booking.guest_count}</Text>
                  {booking.amount != null && (
                    <Text style={styles.bookingDetailRow}>
                      Amount: ₹{booking.amount.toLocaleString("en-IN")}
                    </Text>
                  )}
                  {!!booking.notes && <Text style={styles.bookingDetailRow}>Notes: {booking.notes}</Text>}
                </View>
              ))
            )}
          </View>
        )}

        {/* Block a period */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Blocked Period</Text>

          {services.length === 0 ? (
            <Text style={styles.empty}>Add a service first to manage its blocked dates.</Text>
          ) : (
            <>
              <Text style={styles.label}>Service</Text>
              <View style={styles.chipRow}>
                {services.map((service) => (
                  <Pressable
                    key={service.id}
                    style={[styles.chip, selectedService === service.id && styles.chipActive]}
                    onPress={() => onSelectService(service.id)}
                  >
                    <Text style={[styles.chipText, selectedService === service.id && styles.chipTextActive]}>
                      {service.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.smallLabel}>From</Text>
              {Platform.OS === "web" ? (
                React.createElement("input", {
                  type: "date",
                  value: blockedFrom ? toDateKey(blockedFrom) : "",
                  min: toDateKey(new Date()),
                  onChange: (e: any) => {
                    const v = e.target.value;
                    if (!v) return;
                    const date = fromDateKey(v);
                    setBlockedFrom(date);
                    if (blockedTo && blockedTo < date) setBlockedTo(date);
                  },
                  style: webInputStyle,
                })
              ) : (
                <Pressable style={styles.dateInput} onPress={() => setShowFromPicker(true)}>
                  <Text style={styles.dateInputText}>{blockedFrom ? toDateKey(blockedFrom) : "Select date"}</Text>
                </Pressable>
              )}
              {showFromPicker && Platform.OS !== "web" && (
                <DateTimePicker
                  value={blockedFrom || new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowFromPicker(Platform.OS === "ios");
                    if (date) {
                      setBlockedFrom(date);
                      if (blockedTo && blockedTo < date) setBlockedTo(date);
                    }
                  }}
                />
              )}

              <Text style={styles.smallLabel}>To</Text>
              {Platform.OS === "web" ? (
                React.createElement("input", {
                  type: "date",
                  value: blockedTo ? toDateKey(blockedTo) : "",
                  min: toDateKey(blockedFrom || new Date()),
                  onChange: (e: any) => {
                    const v = e.target.value;
                    if (v) setBlockedTo(fromDateKey(v));
                  },
                  style: webInputStyle,
                })
              ) : (
                <Pressable style={styles.dateInput} onPress={() => setShowToPicker(true)}>
                  <Text style={styles.dateInputText}>{blockedTo ? toDateKey(blockedTo) : "Select date"}</Text>
                </Pressable>
              )}
              {showToPicker && Platform.OS !== "web" && (
                <DateTimePicker
                  value={blockedTo || blockedFrom || new Date()}
                  mode="date"
                  minimumDate={blockedFrom || new Date()}
                  onChange={(_, date) => {
                    setShowToPicker(Platform.OS === "ios");
                    if (date) setBlockedTo(date);
                  }}
                />
              )}

              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Reason (optional)"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <PrimaryButton label="Block Dates" onPress={handleCreate} loading={saving} />
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Blocked Periods ({blockedDates.length})</Text>
        {blockedDates.length === 0 ? (
          <Text style={styles.empty}>No blocked dates for this service.</Text>
        ) : (
          blockedDates.map((blocked) => (
            <View key={blocked.id} style={styles.blockedCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockedRange}>
                  {blocked.blocked_from} → {blocked.blocked_to}
                </Text>
                {!!blocked.reason && <Text style={styles.blockedReason}>{blocked.reason}</Text>}
              </View>
              <Pressable onPress={() => handleDelete(blocked)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {/* Log Offline Booking modal */}
      <Modal visible={!!offlineDateKey} animationType="slide" transparent onRequestClose={() => setOfflineDateKey(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Log Offline Booking</Text>
                  <Text style={styles.modalSubtitle}>
                    Log a job you did (or are doing) outside OccasionX - it'll block the date across your services.
                  </Text>
                </View>
                <Pressable onPress={() => setOfflineDateKey(null)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.smallLabel}>Event Start Date</Text>
              <View style={styles.dateInput}>
                <Text style={styles.dateInputText}>{offlineDateKey}</Text>
              </View>

              <TextInput
                value={offlineForm.customerName}
                onChangeText={(v) => setOfflineForm((p) => ({ ...p, customerName: v }))}
                placeholder="Customer Name *"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <TextInput
                value={offlineForm.customerPhone}
                onChangeText={(v) => setOfflineForm((p) => ({ ...p, customerPhone: v }))}
                placeholder="Customer Phone *"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <TextInput
                value={offlineForm.customerEmail}
                onChangeText={(v) => setOfflineForm((p) => ({ ...p, customerEmail: v }))}
                placeholder="Customer Email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              <TextInput
                value={offlineForm.serviceName}
                onChangeText={(v) => setOfflineForm((p) => ({ ...p, serviceName: v }))}
                placeholder="Service Description *"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Text style={styles.smallLabel}>End Date (optional)</Text>
              {Platform.OS === "web" ? (
                React.createElement("input", {
                  type: "date",
                  value: offlineForm.endDate || "",
                  min: offlineDateKey || undefined,
                  onChange: (e: any) => {
                    const v = e.target.value;
                    setOfflineForm((p) => ({ ...p, endDate: v }));
                  },
                  style: webInputStyle,
                })
              ) : (
                <Pressable style={styles.dateInput} onPress={() => setShowEndDatePicker(true)}>
                  <Text style={styles.dateInputText}>{offlineForm.endDate || "Select date"}</Text>
                </Pressable>
              )}
              {showEndDatePicker && Platform.OS !== "web" && (
                <DateTimePicker
                  value={offlineForm.endDate ? fromDateKey(offlineForm.endDate) : fromDateKey(offlineDateKey!)}
                  mode="date"
                  minimumDate={fromDateKey(offlineDateKey!)}
                  onChange={(_, date) => {
                    setShowEndDatePicker(Platform.OS === "ios");
                    if (date) setOfflineForm((p) => ({ ...p, endDate: toDateKey(date) }));
                  }}
                />
              )}

              <Text style={styles.smallLabel}>Payment Date</Text>
              {Platform.OS === "web" ? (
                React.createElement("input", {
                  type: "date",
                  value: offlineForm.paymentDate || "",
                  max: toDateKey(new Date()),
                  onChange: (e: any) => {
                    const v = e.target.value;
                    setOfflineForm((p) => ({ ...p, paymentDate: v }));
                  },
                  style: webInputStyle,
                })
              ) : (
                <Pressable style={styles.dateInput} onPress={() => setShowPaymentDatePicker(true)}>
                  <Text style={styles.dateInputText}>{offlineForm.paymentDate || "Select date"}</Text>
                </Pressable>
              )}
              {showPaymentDatePicker && Platform.OS !== "web" && (
                <DateTimePicker
                  value={offlineForm.paymentDate ? fromDateKey(offlineForm.paymentDate) : new Date()}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    setShowPaymentDatePicker(Platform.OS === "ios");
                    if (date) setOfflineForm((p) => ({ ...p, paymentDate: toDateKey(date) }));
                  }}
                />
              )}

              <TextInput
                value={offlineForm.amount}
                onChangeText={(v) => setOfflineForm((p) => ({ ...p, amount: v }))}
                placeholder="Amount (₹) *"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                value={offlineForm.guestCount}
                onChangeText={(v) => setOfflineForm((p) => ({ ...p, guestCount: v }))}
                placeholder="Guests (optional)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.smallLabel}>Payment Method</Text>
              <View style={styles.chipRow}>
                {PAYMENT_METHODS.map((method) => (
                  <Pressable
                    key={method}
                    style={[styles.chip, offlineForm.paymentMethod === method && styles.chipActive]}
                    onPress={() => setOfflineForm((p) => ({ ...p, paymentMethod: method }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        offlineForm.paymentMethod === method && styles.chipTextActive,
                      ]}
                    >
                      {method}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.smallLabel}>Payment Type</Text>
              <View style={styles.chipRow}>
                {(["FULL", "ADVANCE"] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.chip, offlineForm.paymentType === type && styles.chipActive]}
                    onPress={() => setOfflineForm((p) => ({ ...p, paymentType: type }))}
                  >
                    <Text style={[styles.chipText, offlineForm.paymentType === type && styles.chipTextActive]}>
                      {type === "FULL" ? "Full Payment" : "Advance Payment"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {offlineForm.paymentType === "ADVANCE" && (
                <TextInput
                  value={offlineForm.amountPaid}
                  onChangeText={(v) => setOfflineForm((p) => ({ ...p, amountPaid: v }))}
                  placeholder="Amount Paid So Far (₹) *"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={styles.input}
                />
              )}

              <TextInput
                value={offlineForm.notes}
                onChangeText={(v) => setOfflineForm((p) => ({ ...p, notes: v }))}
                placeholder="Notes (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.notesInput]}
              />

              <PrimaryButton
                label="Save Offline Booking"
                onPress={handleCreateOffline}
                loading={submittingOffline}
                style={{ marginTop: 8 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bill / receipt modal */}
      <Modal visible={!!billBooking} animationType="slide" transparent onRequestClose={() => setBillBooking(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              {billBooking && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Bill</Text>
                    <Pressable onPress={() => setBillBooking(null)} hitSlop={8}>
                      <Ionicons name="close" size={22} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <Text style={styles.billNumber}>Bill No. OX-{billBooking.id.slice(0, 8).toUpperCase()}</Text>

                  <View style={styles.divider} />
                  <Text style={styles.billBold}>{seller?.business_name || "Provider"}</Text>
                  {!!seller?.phone && <Text style={styles.billText}>Phone: {seller.phone}</Text>}
                  {!!seller?.email && <Text style={styles.billText}>Email: {seller.email}</Text>}

                  <View style={styles.divider} />
                  <Text style={styles.billLabel}>Billed To</Text>
                  <Text style={styles.billBold}>{billBooking.customer_name || "-"}</Text>
                  {!!billBooking.customer_phone && <Text style={styles.billText}>{billBooking.customer_phone}</Text>}
                  {!!billBooking.customer_email && <Text style={styles.billText}>{billBooking.customer_email}</Text>}

                  <View style={styles.divider} />
                  <View style={styles.billRow}>
                    <Text style={styles.billText}>{billBooking.service_name || "Service"}</Text>
                    <Text style={styles.billText}>{formatBookingDates(billBooking)}</Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.billRow}>
                    <Text style={styles.billTotalLabel}>Total</Text>
                    <Text style={styles.billTotalValue}>
                      ₹{(billBooking.amount ?? 0).toLocaleString("en-IN")}
                    </Text>
                  </View>

                  {!!billBooking.payment_method && (
                    <Text style={styles.billMuted}>
                      Paid via {billBooking.payment_method}
                      {billBooking.payment_type === "ADVANCE"
                        ? ` (Advance: ₹${(billBooking.amount_paid ?? 0).toLocaleString("en-IN")} of ₹${(
                            billBooking.amount ?? 0
                          ).toLocaleString("en-IN")})`
                        : " (Full payment)"}
                    </Text>
                  )}
                  {!!billBooking.payment_date && (
                    <Text style={styles.billMuted}>Paid on {billBooking.payment_date}</Text>
                  )}

                  <View style={styles.billActions}>
                    <PrimaryButton
                      label="Share via Email"
                      variant="outline"
                      onPress={() => shareBillEmail(billBooking)}
                    />
                    <PrimaryButton
                      label="Share via WhatsApp"
                      variant="outline"
                      onPress={() => shareBillWhatsapp(billBooking)}
                      style={{ marginTop: 10 }}
                    />
                    <PrimaryButton label="Done" onPress={() => setBillBooking(null)} style={{ marginTop: 10 }} />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  cardTitle: { fontWeight: "700", fontSize: 16, color: colors.text, marginBottom: 12 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  weekdayRow: { flexDirection: "row" },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
    paddingVertical: 6,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayCell: { alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1 },
  dayOpen: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  dayBlocked: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayPast: { backgroundColor: colors.background, borderColor: colors.border },
  dayText: { fontSize: 13, fontWeight: "600" },
  dayTextOpen: { color: "#15803D" },
  dayTextBlocked: { color: "#B91C1C" },
  dayTextSelected: { color: colors.white },
  dayTextPast: { color: colors.textMuted },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#DC2626", marginTop: 2 },
  dayDotSelected: { backgroundColor: colors.white },
  legendRow: { marginTop: 14, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 4, marginBottom: 12 },
  empty: { color: colors.textMuted, marginTop: 4, marginBottom: 16 },
  bookingDetailCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingDetailHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  bookingDetailTitle: { flex: 1, fontWeight: "700", color: colors.text, fontSize: 14 },
  bookingDetailMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: 8 },
  bookingDetailRow: { color: colors.text, fontSize: 13, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  smallLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.white, fontWeight: "600" },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  dateInputText: { color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: colors.background,
  },
  notesInput: { minHeight: 70, textAlignVertical: "top" },
  blockedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockedRange: { fontWeight: "700", color: colors.text, fontSize: 14 },
  blockedReason: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "88%",
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  billNumber: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  billLabel: { color: colors.textMuted, fontSize: 12 },
  billBold: { fontWeight: "700", color: colors.text, marginTop: 2 },
  billText: { color: colors.text, fontSize: 13, marginTop: 2 },
  billRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  billTotalLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  billTotalValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  billMuted: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  billActions: { marginTop: 20 },
});
