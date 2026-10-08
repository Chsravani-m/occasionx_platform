import React, { useCallback, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, RefreshControl, Pressable, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  getProviderDashboard,
  uploadDisplayPicture,
  resolveDisplayPictureUrl,
  ProviderDashboardStats,
} from "@/features/dashboard/providerApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import { TILE_COLORS, iconFor } from "@/core/utils/categoryIcons";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProviderTabParamList, ProviderStackParamList } from "@/core/navigation/types";

// Deterministic fallback tile color off the provider id - same
// convention as mobile-customer-app's ProviderCard, so a provider
// without a display picture (or portfolio photo) still gets a
// consistent, colorful placeholder instead of a blank gray box.
function fallbackColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % TILE_COLORS.length;
  return TILE_COLORS[hash];
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderTabParamList, "Dashboard">,
  NativeStackScreenProps<ProviderStackParamList>
>;

// Colored icon badge + cycled tile background, mirroring the
// mobile-customer-app Profile screen's quick-action treatment so both
// apps feel like the same product instead of the provider side looking
// flat and text-only.
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBadge, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color={colors.white} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.quickAction, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.white} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

export default function DashboardScreen({ navigation }: Props) {
  // A provider account's own id comes back from /auth/login as
  // provider_id alongside the normal user object - stored the same
  // place. AuthContext's `user` here holds the auth-service User row;
  // for providers, provider_id is what booking/provider-service
  // endpoints expect.
  const { user, logout } = useAuth();
  const providerId = (user as any)?.provider_id || user?.id;

  // Used only by the error-state fallback below (when the dashboard
  // itself fails to load) - the normal way to sign out is now via the
  // Settings screen, reached from the gear icon in the header.
  const handleSignOut = () => {
    Alert.alert("Sign out?", "You'll need to sign in again to manage your listing.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const [stats, setStats] = useState<ProviderDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    if (!providerId) return;
    try {
      setError(null);
      const data = await getProviderDashboard(providerId);
      setStats(data);
    } catch {
      setError("Couldn't load your dashboard.");
    }
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Lets a provider set/replace the display picture shown as the
  // background behind their business name on cards and the details
  // page in the customer app (see providerApi.ts) - falls back to a
  // portfolio photo, then a colored tile, when unset.
  const pickAndUploadPhoto = async () => {
    if (!providerId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to set a display picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const uriParts = asset.uri.split(".");
    const ext = uriParts[uriParts.length - 1] || "jpg";

    try {
      setUploadingPhoto(true);
      await uploadDisplayPicture(providerId, {
        uri: asset.uri,
        name: asset.fileName || `display.${ext}`,
        type: asset.mimeType || `image/${ext}`,
      });
      await load();
    } catch (e: any) {
      Alert.alert("Upload failed", e?.response?.data?.detail || "Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) return <LoadingView label="Loading dashboard..." />;

  if (error || !stats) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Image
            source={require("../../../assets/logo-full.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.errorText}>{error || "No data"}</Text>
          <Pressable onPress={handleSignOut} style={styles.errorSignOutButton}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.errorSignOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.avatarWrap} onPress={pickAndUploadPhoto} disabled={uploadingPhoto}>
            {stats.display_picture_url ? (
              <Image
                source={{ uri: resolveDisplayPictureUrl(stats.display_picture_url) }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: fallbackColor(stats.provider_id) }]}>
                <Ionicons name={iconFor(stats.business_name)} size={28} color={colors.white} />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name={uploadingPhoto ? "hourglass-outline" : "camera"} size={12} color={colors.white} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{stats.business_name}</Text>
            <Text style={styles.subtitle}>{stats.verification_status}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            hitSlop={8}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          <StatCard label="Services" value={stats.services_count} icon="briefcase-outline" color={TILE_COLORS[0]} />
          <StatCard label="Portfolio Items" value={stats.portfolio_count} icon="images-outline" color={TILE_COLORS[1]} />
          <StatCard label="Profile Views" value={stats.profile_views} icon="eye-outline" color={TILE_COLORS[2]} />
          <StatCard
            label="Avg Rating"
            value={stats.average_rating?.toFixed(1) ?? "-"}
            icon="star-outline"
            color={TILE_COLORS[3]}
          />
          <StatCard label="Reviews" value={stats.total_reviews} icon="chatbubble-outline" color={TILE_COLORS[4]} />
          <StatCard
            label="Pricing Set Up"
            value={stats.pricing_completed ? "Yes" : "No"}
            icon="pricetag-outline"
            color={TILE_COLORS[5]}
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="briefcase-outline"
            label="Services & Pricing"
            color={TILE_COLORS[0]}
            onPress={() => navigation.navigate("Services")}
          />
          <QuickAction
            icon="images-outline"
            label="Portfolio"
            color={TILE_COLORS[1]}
            onPress={() => navigation.navigate("Portfolio")}
          />
          <QuickAction
            icon="calendar-outline"
            label="Calendar"
            color={TILE_COLORS[2]}
            onPress={() => navigation.navigate("Calendar")}
          />
          <QuickAction
            icon="card-outline"
            label="Bank Details"
            color={TILE_COLORS[3]}
            onPress={() => navigation.navigate("BankDetails")}
          />
          <QuickAction
            icon="document-text-outline"
            label="Booking Policy"
            color={TILE_COLORS[4]}
            onPress={() => navigation.navigate("BookingPolicy")}
          />
          <QuickAction
            icon="notifications-outline"
            label="Notifications"
            color={TILE_COLORS[5]}
            onPress={() => navigation.navigate("Notifications")}
          />
          <QuickAction
            icon="star-outline"
            label="Reviews"
            color={TILE_COLORS[0]}
            onPress={() => navigation.navigate("Reviews")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  logo: { width: 160, height: 47, marginBottom: 16 },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 20 },
  errorText: { color: colors.danger, textAlign: "center" },
  errorSignOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorSignOutText: { color: colors.danger, fontWeight: "600" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatarWrap: { position: "relative", marginRight: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statCard: {
    width: "48%",
    minHeight: 108,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.primary },
  statLabel: { color: colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 12, marginBottom: 12 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  quickActionLabel: { color: colors.white, fontWeight: "700", fontSize: 13 },
});
