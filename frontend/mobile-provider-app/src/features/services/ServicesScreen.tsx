import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, Alert, Modal, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getProviderServices,
  createProviderService,
  deleteProviderService,
  ProviderService,
} from "@/features/services/providerServiceApi";
import { getCategories, getSubcategories, Category, Subcategory } from "@/features/services/catalogApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import { TILE_COLORS, iconFor } from "@/core/utils/categoryIcons";
import { getServiceAttributeSchema } from "@/features/services/serviceAttributesSchema";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProviderStackParamList } from "@/core/navigation/types";

// Deterministic color-per-service (off the service id, not list index)
// so a card doesn't shift color on re-render/re-sort - same convention
// as mobile-customer-app's ProviderCard fallback tile.
function tileColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % TILE_COLORS.length;
  return TILE_COLORS[hash];
}

type Props = NativeStackScreenProps<ProviderStackParamList, "Services">;

export default function ServicesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const providerId = (user as any)?.provider_id || user?.id;

  const [services, setServices] = useState<ProviderService[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category list can run to 50+ entries, which used to render as an
  // inline chip row that pushed the rest of the form off-screen. Swapped
  // for a compact "select field" that opens a searchable bottom-sheet
  // Modal, mirroring the modalOverlay/modalCard/modalHeader pattern
  // already used by CalendarScreen.tsx in this app.
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name;
  const selectedSubcategoryName = subcategories.find((s) => s.id === subcategoryId)?.name;

  const filteredCategories = categorySearch.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(categorySearch.trim().toLowerCase()))
    : categories;

  const load = useCallback(async () => {
    if (!providerId) return;
    try {
      setError(null);
      const [svc, cats] = await Promise.all([getProviderServices(providerId), getCategories()]);
      setServices(svc);
      setCategories(cats);
      const map: Record<string, string> = {};
      cats.forEach((c) => {
        map[c.id] = c.name;
      });
      setCategoryNames(map);
    } catch {
      setError("Couldn't load your services.");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSelectCategory = async (id: string) => {
    setCategoryId(id);
    setSubcategoryId("");
    setShowCategoryPicker(false);
    setCategorySearch("");
    try {
      const subs = await getSubcategories(id);
      setSubcategories(subs);
    } catch {
      setSubcategories([]);
    }
  };

  const handleAddService = async () => {
    if (!providerId) return;
    if (!name.trim()) {
      Alert.alert("Service name is required");
      return;
    }
    if (!categoryId) {
      Alert.alert("Please select a category");
      return;
    }
    try {
      setSaving(true);
      await createProviderService(providerId, {
        name: name.trim(),
        description: description.trim() || undefined,
        category_id: categoryId,
        subcategory_id: subcategoryId || undefined,
      });
      setName("");
      setDescription("");
      setCategoryId("");
      setSubcategoryId("");
      setSubcategories([]);
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't add service", e?.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (service: ProviderService) => {
    Alert.alert("Delete service?", `Remove "${service.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProviderService(service.id);
            await load();
          } catch {
            Alert.alert("Couldn't delete this service. Please try again.");
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingView label="Loading your services..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>My Services</Text>
        <Text style={styles.subtitle}>Manage the services you offer to customers.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a Service</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Service Name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Category</Text>
          <Pressable style={styles.selectField} onPress={() => setShowCategoryPicker(true)}>
            <Text style={selectedCategoryName ? styles.selectFieldText : styles.selectPlaceholder}>
              {selectedCategoryName || "Select a category"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </Pressable>

          {!!subcategories.length && (
            <>
              <Text style={styles.label}>Subcategory (optional)</Text>
              <Pressable style={styles.selectField} onPress={() => setShowSubcategoryPicker(true)}>
                <Text style={selectedSubcategoryName ? styles.selectFieldText : styles.selectPlaceholder}>
                  {selectedSubcategoryName || "Select a subcategory"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
            </>
          )}

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <PrimaryButton label="+ Add Service" onPress={handleAddService} loading={saving} />
        </View>

        <Modal
          visible={showCategoryPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Select Category</Text>
                  <Text style={styles.modalSubtitle}>Choose the category this service belongs to</Text>
                </View>
                <Pressable onPress={() => setShowCategoryPicker(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <TextInput
                value={categorySearch}
                onChangeText={setCategorySearch}
                placeholder="Search categories..."
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <FlatList
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 360 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={styles.empty}>No categories match your search.</Text>}
                renderItem={({ item }) => (
                  <Pressable style={styles.optionRow} onPress={() => onSelectCategory(item.id)}>
                    <Text style={[styles.optionText, categoryId === item.id && styles.optionTextActive]}>
                      {item.name}
                    </Text>
                    {categoryId === item.id && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={showSubcategoryPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowSubcategoryPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Select Subcategory</Text>
                  <Text style={styles.modalSubtitle}>Optional - narrows down your service listing</Text>
                </View>
                <Pressable onPress={() => setShowSubcategoryPicker(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <FlatList
                data={subcategories}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.optionRow}
                    onPress={() => {
                      setSubcategoryId(subcategoryId === item.id ? "" : item.id);
                      setShowSubcategoryPicker(false);
                    }}
                  >
                    <Text style={[styles.optionText, subcategoryId === item.id && styles.optionTextActive]}>
                      {item.name}
                    </Text>
                    {subcategoryId === item.id && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                )}
              />
            </View>
          </View>
        </Modal>

        <Text style={styles.sectionTitle}>Existing Services ({services.length})</Text>

        {services.length === 0 ? (
          <Text style={styles.empty}>You haven't added any services yet.</Text>
        ) : (
          services.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceCardHeader}>
                <View style={[styles.serviceIcon, { backgroundColor: tileColor(service.id) }]}>
                  <Ionicons name={iconFor(service.name)} size={18} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceCategory}>
                    {categoryNames[service.category_id] || "Uncategorized"}
                  </Text>
                  {!!service.description && (
                    <Text style={styles.serviceDescription}>{service.description}</Text>
                  )}
                </View>
                <Pressable onPress={() => handleDelete(service)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.pricingButton}
                  onPress={() => navigation.navigate("Pricing", { serviceId: service.id, serviceName: service.name })}
                >
                  <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                  <Text style={styles.pricingButtonText}>Manage Pricing</Text>
                </Pressable>

                {!!getServiceAttributeSchema(categoryNames[service.category_id] || "") && (
                  <Pressable
                    style={styles.pricingButton}
                    onPress={() =>
                      navigation.navigate("Specifications", {
                        serviceId: service.id,
                        serviceName: service.name,
                        categoryName: categoryNames[service.category_id] || "",
                        attributes: service.attributes,
                      })
                    }
                  >
                    <Ionicons name="list-outline" size={16} color={colors.primary} />
                    <Text style={styles.pricingButtonText}>Specifications</Text>
                  </Pressable>
                )}
              </View>
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
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 8, marginTop: 4 },
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
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  selectFieldText: { color: colors.text, fontSize: 14 },
  selectPlaceholder: { color: colors.textMuted, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: { color: colors.text, fontSize: 14, flex: 1, paddingRight: 12 },
  optionTextActive: { color: colors.primary, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 12 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 20 },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceName: { fontWeight: "700", color: colors.text, fontSize: 15 },
  serviceCategory: { color: colors.primary, fontSize: 12, marginTop: 2 },
  serviceDescription: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginTop: 12,
  },
  pricingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  pricingButtonText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
});
