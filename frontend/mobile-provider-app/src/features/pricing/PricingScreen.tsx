import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  createPricing,
  getServicePricing,
  deletePricing,
  Pricing,
  PricingType,
} from "@/features/pricing/providerPricingApi";
import { Screen, LoadingView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProviderStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<ProviderStackParamList, "Pricing">;

const PRICING_TYPES: { value: PricingType; label: string }[] = [
  { value: "FIXED", label: "Fixed Price" },
  { value: "HOURLY", label: "Hourly" },
  { value: "PACKAGE", label: "Package" },
  { value: "PER_PERSON", label: "Per Person" },
  { value: "PER_PLATE", label: "Per Plate" },
  { value: "PER_DAY", label: "Per Day" },
  { value: "CUSTOM", label: "Custom Quote" },
];

const MAX_OCCUPANCY_PER_ROOM = 4;

export default function PricingScreen({ route }: Props) {
  const { serviceId, serviceName } = route.params;

  const [pricingList, setPricingList] = useState<Pricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pricingType, setPricingType] = useState<PricingType>("FIXED");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [occupancyPerRoom, setOccupancyPerRoom] = useState("");
  const [totalRooms, setTotalRooms] = useState("");

  const isPerUnit = pricingType === "PER_PLATE" || pricingType === "PER_PERSON";
  const isPerDay = pricingType === "PER_DAY";

  const load = useCallback(async () => {
    try {
      const data = await getServicePricing(serviceId);
      setPricingList(data);
    } catch {
      Alert.alert("Couldn't load pricing for this service.");
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const resetForm = () => {
    setAmount("");
    setUnit("");
    setMinQuantity("");
    setMaxQuantity("");
    setDescription("");
    setOccupancyPerRoom("");
    setTotalRooms("");
  };

  const handleCreate = async () => {
    if (!amount) {
      Alert.alert("Amount is required");
      return;
    }
    if (isPerUnit && !maxQuantity) {
      Alert.alert(
        "Maximum Quantity is required",
        "For Per Plate / Per Person pricing, set it to the actual number of people this covers."
      );
      return;
    }
    if (
      isPerDay &&
      occupancyPerRoom &&
      (Number(occupancyPerRoom) < 1 || Number(occupancyPerRoom) > MAX_OCCUPANCY_PER_ROOM)
    ) {
      Alert.alert(`Guests per Room must be between 1 and ${MAX_OCCUPANCY_PER_ROOM}.`);
      return;
    }
    if (isPerDay && totalRooms && Number(totalRooms) < 1) {
      Alert.alert("Total Rooms/Suites must be at least 1.");
      return;
    }

    try {
      setSaving(true);
      await createPricing(serviceId, {
        pricing_type: pricingType,
        amount: Number(amount),
        currency: "INR",
        unit: unit || undefined,
        min_quantity: minQuantity ? Number(minQuantity) : undefined,
        max_quantity: maxQuantity ? Number(maxQuantity) : undefined,
        description: description || undefined,
        occupancy_per_room: isPerDay && occupancyPerRoom ? Number(occupancyPerRoom) : undefined,
        total_rooms: isPerDay && totalRooms ? Number(totalRooms) : undefined,
      });
      resetForm();
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't add pricing", e?.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (pricing: Pricing) => {
    Alert.alert("Delete this pricing?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePricing(pricing.id);
            await load();
          } catch {
            Alert.alert("Couldn't delete this pricing. Please try again.");
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingView label="Loading pricing..." />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Pricing</Text>
        <Text style={styles.subtitle}>{serviceName}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Pricing</Text>

          <Text style={styles.label}>Pricing Type</Text>
          <View style={styles.chipRow}>
            {PRICING_TYPES.map((t) => (
              <Pressable
                key={t.value}
                style={[styles.chip, pricingType === t.value && styles.chipActive]}
                onPress={() => setPricingType(t.value)}
              >
                <Text style={[styles.chipText, pricingType === t.value && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={styles.input}
          />

          <TextInput
            value={unit}
            onChangeText={setUnit}
            placeholder="Unit (plate, guest, day, hour)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          {isPerUnit && (
            <>
              <TextInput
                value={minQuantity}
                onChangeText={setMinQuantity}
                placeholder="Minimum Quantity"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                value={maxQuantity}
                onChangeText={setMaxQuantity}
                placeholder="Maximum Quantity"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />
              <Text style={styles.hint}>
                Maximum Quantity is required for Per Plate / Per Person pricing - set it to the
                actual number of people this covers.
              </Text>
            </>
          )}

          {isPerDay && (
            <>
              <TextInput
                value={occupancyPerRoom}
                onChangeText={setOccupancyPerRoom}
                placeholder={`Guests per Room (max ${MAX_OCCUPANCY_PER_ROOM})`}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />
              <Text style={styles.hint}>
                Used to auto-suggest how many rooms a booking needs based on guest count.
              </Text>

              <TextInput
                value={totalRooms}
                onChangeText={setTotalRooms}
                placeholder="Total Rooms/Suites available"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />
              <Text style={styles.hint}>
                When set, multiple customers can book the same date as long as rooms requested
                don't exceed this count.
              </Text>
            </>
          )}

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <PrimaryButton label="Add Pricing" onPress={handleCreate} loading={saving} />
        </View>

        <Text style={styles.sectionTitle}>Pricing Records ({pricingList.length})</Text>

        {pricingList.length === 0 ? (
          <Text style={styles.empty}>No pricing set up for this service yet.</Text>
        ) : (
          pricingList.map((pricing) => (
            <View key={pricing.id} style={styles.pricingCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pricingName}>{pricing.description || pricing.pricing_type}</Text>
                <Text style={styles.pricingAmount}>
                  ₹{pricing.amount.toLocaleString("en-IN")}
                  {pricing.unit ? ` / ${pricing.unit}` : ""}
                </Text>
                {!!pricing.total_rooms && (
                  <Text style={styles.pricingMeta}>
                    {pricing.total_rooms} room(s)/suite(s) available
                  </Text>
                )}
                {(!!pricing.min_quantity || !!pricing.max_quantity) && (
                  <Text style={styles.pricingMeta}>
                    {pricing.min_quantity ? `Min ${pricing.min_quantity}` : ""}
                    {pricing.min_quantity && pricing.max_quantity ? " · " : ""}
                    {pricing.max_quantity ? `Max ${pricing.max_quantity}` : ""}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => handleDelete(pricing)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontWeight: "700", fontSize: 16, color: colors.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    marginBottom: 12,
  },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  hint: { color: colors.textMuted, fontSize: 11, marginBottom: 12, marginTop: -6 },
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
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 12 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 20 },
  pricingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pricingName: { fontWeight: "700", color: colors.text, fontSize: 15 },
  pricingAmount: { color: colors.primary, fontWeight: "700", fontSize: 16, marginTop: 4 },
  pricingMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
