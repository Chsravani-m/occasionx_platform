import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { updateProviderService } from "@/features/services/providerServiceApi";
import { getServiceAttributeSchema, AttributeField } from "@/features/services/serviceAttributesSchema";
import { Screen } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProviderStackParamList } from "@/core/navigation/types";

// Mirrors frontend/web-app's provider-onboarding/ServiceAttributesForm.tsx
// (a modal there; a pushed stack screen here, same as how this app's
// PricingScreen is a screen rather than a modal). Renders whatever
// getServiceAttributeSchema(categoryName) returns for this service's
// category - see that util for why the field list varies per category
// - and saves the collected values as a flat map on Service.attributes
// via updateProviderService.
//
// The service's current attributes (if any) are passed in via route
// params rather than re-fetched here, since ServicesScreen already has
// the full service list loaded when it navigates to this screen.

type Props = NativeStackScreenProps<ProviderStackParamList, "Specifications">;

export default function SpecificationsScreen({ route, navigation }: Props) {
  const { serviceId, categoryName, attributes } = route.params;

  const sections = getServiceAttributeSchema(categoryName) ?? [];

  const [values, setValues] = useState<Record<string, unknown>>(attributes ?? {});
  const [saving, setSaving] = useState(false);

  const setValue = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleOption = (key: string, option: string) => {
    setValues((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProviderService(serviceId, { attributes: values });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Couldn't save specifications", e?.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: AttributeField) => {
    if (field.type === "boolean") {
      const checked = !!values[field.key];
      return (
        <Pressable
          key={field.key}
          style={styles.booleanRow}
          onPress={() => setValue(field.key, !checked)}
        >
          <Ionicons
            name={checked ? "checkbox" : "square-outline"}
            size={20}
            color={checked ? colors.primary : colors.textMuted}
          />
          <Text style={styles.booleanLabel}>{field.label}</Text>
        </Pressable>
      );
    }

    if (field.type === "number") {
      return (
        <View key={field.key} style={styles.fieldBlock}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            value={values[field.key] != null ? String(values[field.key]) : ""}
            onChangeText={(text) => setValue(field.key, text ? Number(text) : "")}
            placeholder={field.label}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
      );
    }

    if (field.type === "text") {
      return (
        <View key={field.key} style={styles.fieldBlock}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            value={values[field.key] != null ? String(values[field.key]) : ""}
            onChangeText={(text) => setValue(field.key, text)}
            placeholder={field.label}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>
      );
    }

    // checkbox_group
    const selected = Array.isArray(values[field.key]) ? (values[field.key] as string[]) : [];
    return (
      <View key={field.key} style={styles.fieldBlock}>
        <Text style={styles.label}>{field.label}</Text>
        <View style={styles.chipRow}>
          {(field.options ?? []).map((option) => {
            const active = selected.includes(option);
            return (
              <Pressable
                key={option}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleOption(field.key, option)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Specifications</Text>
        <Text style={styles.subtitle}>{categoryName}</Text>

        {sections.length === 0 ? (
          <Text style={styles.empty}>
            No specification fields are defined for this category yet.
          </Text>
        ) : (
          sections.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              {section.fields.map(renderField)}
            </View>
          ))
        )}

        {sections.length > 0 && (
          <PrimaryButton label="Save Specifications" onPress={handleSave} loading={saving} />
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
    marginBottom: 16,
  },
  cardTitle: { fontWeight: "700", fontSize: 16, color: colors.text, marginBottom: 12 },
  fieldBlock: { marginBottom: 14 },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
  },
  booleanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  booleanLabel: { color: colors.text, fontSize: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 20 },
});
