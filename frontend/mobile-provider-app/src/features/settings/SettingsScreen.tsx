import React from "react";
import { View, Text, Pressable, StyleSheet, Linking, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/core/context/AuthContext";
import { WEB_APP_URL } from "@/core/api/client";
import { Screen } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProviderStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<ProviderStackParamList, "Settings">;

// Mirrors mobile-customer-app's SettingsScreen. Reached via the gear
// icon on the Dashboard header (replaces the old bare Sign Out icon
// there) - Sign Out now lives here instead.
export default function SettingsScreen({ navigation }: Props) {
  const { logout } = useAuth();

  const openLegalPage = (path: string) => {
    Linking.openURL(`${WEB_APP_URL}${path}`).catch(() => {
      Alert.alert("Couldn't open that page. Please try again.");
    });
  };

  const handleLogout = () => {
    Alert.alert("Sign out?", "You'll need to sign in again to manage your listing.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigation.navigate("Notifications")}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Booking Policy"
            onPress={() => navigation.navigate("BookingPolicy")}
          />
        </View>

        <View style={styles.section}>
          <SettingsRow
            icon="document-text-outline"
            label="Terms & Conditions"
            onPress={() => openLegalPage("/terms/provider")}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => openLegalPage("/privacy")}
          />
        </View>

        <PrimaryButton label="Sign Out" variant="outline" onPress={handleLogout} style={styles.logout} />
      </ScrollView>
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 16 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: "500" },
  logout: { marginTop: 8 },
});
