import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, TextInput, FlatList, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/core/theme/colors";
import { useLocationContext } from "@/core/context/LocationContext";
import { useAuth } from "@/core/context/AuthContext";
import { navigateTo, goBack } from "@/core/navigation/navigationRef";
import { getFullCatalog } from "@/features/browse/catalogApi";

// Rendered once, as a sibling of the Stack.Navigator (see RootNavigator),
// so it never unmounts as screens push/pop - the search bar and location
// pill stay visible on every page instead of only on Home. Navigates via
// the imperative navigationRef since this isn't inside a navigator's
// screen tree and can't use useNavigation().
export default function AppHeader({ canGoBack }: { canGoBack: boolean }) {
  const {
    location,
    loading: locationLoading,
    permissionDenied,
    detectLocation,
    setManualLocation,
  } = useLocationContext();
  const { user } = useAuth();
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [headerHeight, setHeaderHeight] = useState(0);
  const [suggestionTerms, setSuggestionTerms] = useState<string[]>([]);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const insets = useSafeAreaInsets();

  const firstName = user?.fullName?.split(" ")[0];

  // Every category + subcategory name, fetched once and filtered
  // locally as the user types - powers the suggestions dropdown below
  // (no request per keystroke). A flat, deduped list is all that's
  // needed since we're just matching substrings, not preserving the
  // category/subcategory hierarchy.
  useEffect(() => {
    getFullCatalog()
      .then((catalog) => {
        const names = [
          ...catalog.categories.map((c) => c.name),
          ...catalog.subcategories.map((s) => s.name),
        ];
        setSuggestionTerms(Array.from(new Set(names)));
      })
      .catch(() => setSuggestionTerms([]));
  }, []);

  // The search bar lives here (not on SearchResultsScreen) so it's the
  // one thing that's genuinely persistent across every page - typing
  // anywhere jumps to/updates SearchResults. Re-navigating to the
  // screen that's already focused just merges params instead of
  // pushing a new entry, so this is safe to call on every keystroke.
  // `keepSuggestionsSuppressed` is set when this is called from
  // selectSuggestion below, so picking a suggestion doesn't
  // immediately reopen the dropdown with leftover partial matches.
  const updateSearch = (text: string, keepSuggestionsSuppressed = false) => {
    setSearchText(text);
    if (!keepSuggestionsSuppressed) setSuppressSuggestions(false);
    navigateTo("SearchResults", { keyword: text || undefined });
  };

  // Prefix matches ("phot..." -> "Photography") rank above matches
  // buried in the middle of a word, and everything's capped at 6 rows
  // so the dropdown never dwarfs the screen.
  const suggestions = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const name of suggestionTerms) {
      const lower = name.toLowerCase();
      if (lower === term) continue;
      if (lower.startsWith(term)) starts.push(name);
      else if (lower.includes(term)) contains.push(name);
    }
    return [...starts, ...contains].slice(0, 6);
  }, [searchText, suggestionTerms]);

  const showSuggestions = !suppressSuggestions && suggestions.length > 0;

  const selectSuggestion = (name: string) => {
    Keyboard.dismiss();
    setSuppressSuggestions(true);
    updateSearch(name, true);
  };

  const locationLabel = location?.city
    ? location.city
    : locationLoading
    ? "Detecting location..."
    : "Set your location";

  const submitManualLocation = async () => {
    if (!locationInput.trim()) return;
    await setManualLocation(locationInput.trim());
    setLocationInput("");
    setLocationModalVisible(false);
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.searchRow}>
        {canGoBack ? (
          <Pressable onPress={goBack} hitSlop={8} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
        ) : null}

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={updateSearch}
            onFocus={() => navigateTo("SearchResults", { keyword: searchText || undefined })}
            placeholder="Search for photographers, caterers, decorators..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
          {searchText.length > 0 ? (
            <Pressable onPress={() => updateSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Pressable
          style={styles.locationPill}
          onPress={() => {
            setLocationInput(location?.city ?? "");
            setLocationModalVisible(true);
          }}
        >
          <Ionicons name="location-outline" size={14} color={colors.white} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationLabel}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.white} />
        </Pressable>

        {firstName ? (
          <Text style={styles.welcomeText} numberOfLines={1}>
            Welcome, {firstName}
          </Text>
        ) : null}
      </View>

      {permissionDenied ? (
        <Pressable onPress={detectLocation}>
          <Text style={styles.retryLocation}>
            Couldn&apos;t detect your location - tap to try again, or set it manually above.
          </Text>
        </Pressable>
      ) : null}

      {/*
        Suggestions dropdown, shown while typing. Rendered via Modal
        rather than an absolutely-positioned sibling View because
        AppHeader and the screen content below it are separate
        subtrees under RootNavigator - an absolute View nested inside
        AppHeader paints during AppHeader's turn in the render order,
        so the content View (mounted right after AppHeader) would
        still draw over it. A Modal is a true top-level OS layer, so
        it always wins regardless of tree position. It's positioned
        using the safe-area top inset + this header's own measured
        height (captured via onLayout above) so it lands right under
        the search bar instead of at the very top of the physical
        screen, which Modal doesn't otherwise account for.
      */}
      <Modal
        visible={showSuggestions}
        transparent
        animationType="none"
        onRequestClose={() => setSuppressSuggestions(true)}
      >
        <Pressable
          style={styles.suggestionsBackdrop}
          onPress={() => {
            Keyboard.dismiss();
            setSuppressSuggestions(true);
          }}
        >
          {/* No-op onPress absorbs taps landing inside the box but not
              on a specific row, so only tapping the backdrop outside
              the box dismisses the dropdown. */}
          <Pressable
            style={[styles.suggestionsBox, { top: insets.top + headerHeight }]}
            onPress={() => {}}
          >
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable style={styles.suggestionRow} onPress={() => selectSuggestion(item)}>
                  <Ionicons name="search" size={15} color={colors.textMuted} />
                  <Text style={styles.suggestionText}>{item}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={locationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set your location</Text>
            <Text style={styles.modalSubtitle}>
              Enter your city or area so we can show providers near you.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={locationInput}
              onChangeText={setLocationInput}
              placeholder="e.g. Hyderabad"
              autoFocus
              onSubmitEditing={submitManualLocation}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalUseGps}
                onPress={() => {
                  setLocationModalVisible(false);
                  detectLocation();
                }}
              >
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                <Text style={styles.modalUseGpsText}>Use current location</Text>
              </Pressable>
              <View style={styles.modalButtonRow}>
                <Pressable style={styles.modalCancel} onPress={() => setLocationModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSave} onPress={submitManualLocation}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryDark,
  },
  searchRow: { flexDirection: "row", alignItems: "center" },
  backButton: { marginRight: 8, padding: 4 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, marginLeft: 8, color: colors.text, fontSize: 14 },
  suggestionsBackdrop: { flex: 1 },
  suggestionsBox: {
    position: "absolute",
    left: 16,
    right: 16,
    maxHeight: 280,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { fontSize: 14, color: colors.text, flexShrink: 1 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    maxWidth: "60%",
  },
  locationText: { marginHorizontal: 5, color: colors.white, fontWeight: "600", fontSize: 12, flexShrink: 1 },
  welcomeText: { color: colors.white, fontWeight: "600", fontSize: 12, marginLeft: 10, flexShrink: 1 },
  retryLocation: { marginTop: 6, color: colors.white, fontSize: 12, textDecorationLine: "underline" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalSubtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 14, fontSize: 13 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalActions: { marginTop: 16 },
  modalUseGps: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  modalUseGpsText: { marginLeft: 6, color: colors.primary, fontWeight: "600" },
  modalButtonRow: { flexDirection: "row", justifyContent: "flex-end" },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalCancelText: { color: colors.textMuted, fontWeight: "600" },
  modalSave: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  modalSaveText: { color: "#fff", fontWeight: "700" },
});
