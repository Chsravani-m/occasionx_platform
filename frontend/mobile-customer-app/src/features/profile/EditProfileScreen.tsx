import React, { useCallback, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getProfile, updateProfile, UserProfile } from "@/features/profile/profileApi";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";

// Mirrors web-app/src/screens/ProfilePage.tsx - same fields, same
// view/edit toggle - just laid out for a single-column mobile screen
// instead of a two-column card grid. Reached by tapping the greeting
// header on ProfileScreen.
export default function EditProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      getProfile()
        .then((data) => {
          if (!cancelled) setProfile(data);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load your profile. Pull down to retry.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await updateProfile(profile);
      setProfile(updated);
      setEditMode(false);
    } catch {
      Alert.alert("Couldn't save changes", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof UserProfile) => (value: string) =>
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));

  if (loading) return <LoadingView label="Loading your profile..." />;
  if (error || !profile) return <ErrorView message={error || "Profile unavailable."} />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Profile</Text>
          {!editMode ? (
            <Pressable style={styles.editButton} onPress={() => setEditMode(true)}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        <Field label="First Name" value={profile.first_name} editable={editMode} onChangeText={set("first_name")} />
        <Field label="Last Name" value={profile.last_name} editable={editMode} onChangeText={set("last_name")} />
        <Field label="Email" value={profile.email} editable={false} onChangeText={() => {}} />
        <Field label="Phone" value={profile.phone} editable={editMode} onChangeText={set("phone")} keyboardType="phone-pad" />
        <Field label="Address" value={profile.address} editable={editMode} onChangeText={set("address")} />
        <Field label="City" value={profile.city} editable={editMode} onChangeText={set("city")} />
        <Field label="State" value={profile.state} editable={editMode} onChangeText={set("state")} />
        <Field label="Country" value={profile.country} editable={editMode} onChangeText={set("country")} />
        <Field label="Pincode" value={profile.pincode} editable={editMode} onChangeText={set("pincode")} keyboardType="number-pad" />

        <Text style={styles.label}>Bio</Text>
        {editMode ? (
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={profile.bio ?? ""}
            onChangeText={set("bio")}
            multiline
            numberOfLines={4}
            placeholder="Tell us a bit about yourself"
          />
        ) : (
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyText}>{profile.bio || "No bio added yet"}</Text>
          </View>
        )}

        {editMode ? (
          <View style={styles.actionsRow}>
            <PrimaryButton label="Save Changes" onPress={handleSave} loading={saving} style={styles.actionButton} />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => setEditMode(false)}
              style={styles.actionButton}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  value,
  editable,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value?: string;
  editable: boolean;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.input}
          value={value ?? ""}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
        />
      ) : (
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{value || "Not provided"}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  fieldWrap: { marginBottom: 14 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 6, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  bioInput: { minHeight: 90, textAlignVertical: "top" },
  readOnlyBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readOnlyText: { color: colors.text, fontSize: 15 },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionButton: { flex: 1 },
});
