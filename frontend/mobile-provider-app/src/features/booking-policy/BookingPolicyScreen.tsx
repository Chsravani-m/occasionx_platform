import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import {
  getBookingPolicy,
  updateBookingPolicy,
} from "@/features/booking-policy/providerBookingPolicyApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";

type NoticeUnit = "hours" | "days";

export default function BookingPolicyScreen() {
  const { user } = useAuth();
  const providerId = (user as any)?.provider_id || user?.id;

  // The backend only stores hours (booking_notice_hours) - a provider
  // needing "10 days notice" shouldn't have to do the ×24 math
  // themselves, so this lets them enter either unit and converts
  // under the hood.
  const [noticeUnit, setNoticeUnit] = useState<NoticeUnit>("hours");
  const [noticeValue, setNoticeValue] = useState("6");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    getBookingPolicy(providerId)
      .then((policy) => {
        const hours = policy.booking_notice_hours ?? 6;
        // Default to whichever unit displays as a clean whole number,
        // so e.g. a saved 240 shows as "10 days" not "240 hours".
        if (hours >= 24 && hours % 24 === 0) {
          setNoticeUnit("days");
          setNoticeValue(String(hours / 24));
        } else {
          setNoticeUnit("hours");
          setNoticeValue(String(hours));
        }
        setCancellationPolicy(policy.cancellation_policy || "");
      })
      .finally(() => setLoading(false));
  }, [providerId]);

  if (loading) return <LoadingView label="Loading booking policy..." />;

  const parsedValue = parseFloat(noticeValue);
  const computedHours =
    !isNaN(parsedValue) && parsedValue >= 0
      ? Math.round(noticeUnit === "days" ? parsedValue * 24 : parsedValue)
      : null;

  const switchUnit = (unit: NoticeUnit) => {
    if (unit === noticeUnit) return;
    if (computedHours !== null) {
      setNoticeValue(
        unit === "days" ? String(computedHours / 24) : String(computedHours)
      );
    }
    setNoticeUnit(unit);
  };

  const handleSave = async () => {
    if (!providerId) return;
    if (computedHours === null) {
      Alert.alert("Invalid", `Enter a valid number of ${noticeUnit}.`);
      return;
    }
    setSaving(true);
    try {
      await updateBookingPolicy(providerId, {
        booking_notice_hours: computedHours,
        cancellation_policy: cancellationPolicy || undefined,
      });
      Alert.alert("Saved", "Your booking policy was updated.");
    } catch {
      Alert.alert("Error", "Couldn't save your booking policy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Booking Policy</Text>
        <Text style={styles.helper}>
          Set how much advance notice customers must give before your service's
          event date/time, and share your cancellation terms. These are shown
          to customers before they book.
        </Text>

        <Text style={styles.label}>Minimum Booking Notice</Text>
        <View style={styles.noticeRow}>
          <TextInput
            style={[styles.input, styles.noticeInput]}
            value={noticeValue}
            onChangeText={setNoticeValue}
            keyboardType="number-pad"
            placeholder={noticeUnit === "days" ? "e.g. 10" : "e.g. 6"}
          />
          <View style={styles.unitToggle}>
            <Pressable
              style={[styles.unitOption, noticeUnit === "hours" && styles.unitOptionActive]}
              onPress={() => switchUnit("hours")}
            >
              <Text style={[styles.unitOptionText, noticeUnit === "hours" && styles.unitOptionTextActive]}>
                Hours
              </Text>
            </Pressable>
            <Pressable
              style={[styles.unitOption, noticeUnit === "days" && styles.unitOptionActive]}
              onPress={() => switchUnit("days")}
            >
              <Text style={[styles.unitOptionText, noticeUnit === "days" && styles.unitOptionTextActive]}>
                Days
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.hint}>
          Example: with 6 hours' notice, a customer must book at least 6
          hours before the event's start time. With 10 days' notice, they
          must book at least 10 days before the event.
        </Text>

        <Text style={styles.label}>Cancellation Policy</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={cancellationPolicy}
          onChangeText={setCancellationPolicy}
          placeholder="Describe your cancellation terms & conditions..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <PrimaryButton label="Save" onPress={handleSave} loading={saving} style={styles.saveButton} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  helper: { color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
  label: { color: colors.text, fontWeight: "500", marginTop: 12, marginBottom: 6 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: { minHeight: 120, paddingTop: 10 },
  saveButton: { marginTop: 24 },
  noticeRow: { flexDirection: "row", gap: 10 },
  noticeInput: { flex: 1 },
  unitToggle: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  unitOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
  },
  unitOptionActive: { backgroundColor: colors.primary },
  unitOptionText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  unitOptionTextActive: { color: colors.white },
});
