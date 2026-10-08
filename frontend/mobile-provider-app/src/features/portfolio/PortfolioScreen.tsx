import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  getPortfolio,
  uploadPortfolio,
  deletePortfolio,
  resolveMediaUrl,
  PortfolioItem,
  RNFile,
} from "@/features/portfolio/providerPortfolioApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView, ErrorView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProviderStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<ProviderStackParamList, "Portfolio">;

// Web supports a third "Project Albums" (ZIP) media type uploaded from a
// desktop file picker - there's no equivalent camera-roll flow for a
// .zip on a phone, so mobile upload only covers images/videos. Existing
// ZIP items (added via the web app) still show up in the list below,
// just without an upload path here.
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

export default function PortfolioScreen({}: Props) {
  const { user } = useAuth();
  const providerId = (user as any)?.provider_id || user?.id;

  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pickedAsset, setPickedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!providerId) return;
    try {
      setError(null);
      const data = await getPortfolio(providerId);
      setItems(data);
    } catch {
      setError("Couldn't load your portfolio.");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add portfolio media.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const isVideo = asset.type === "video";
    const maxBytes = (isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;
    if (asset.fileSize && asset.fileSize > maxBytes) {
      Alert.alert(
        "File too large",
        `${isVideo ? "Videos" : "Images"} must be under ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB}MB.`
      );
      return;
    }

    setPickedAsset(asset);
  };

  const handleUpload = async () => {
    if (!providerId || !pickedAsset) {
      Alert.alert("Please choose a photo or video first");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Title is required");
      return;
    }

    const isVideo = pickedAsset.type === "video";
    const uriParts = pickedAsset.uri.split(".");
    const ext = uriParts[uriParts.length - 1] || (isVideo ? "mp4" : "jpg");
    const file: RNFile = {
      uri: pickedAsset.uri,
      name: pickedAsset.fileName || `portfolio.${ext}`,
      type: pickedAsset.mimeType || (isVideo ? `video/${ext}` : `image/${ext}`),
    };

    try {
      setUploading(true);
      await uploadPortfolio(providerId, title.trim(), description.trim(), file);
      setTitle("");
      setDescription("");
      setPickedAsset(null);
      await load();
    } catch (e: any) {
      Alert.alert("Upload failed", e?.response?.data?.detail || "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (item: PortfolioItem) => {
    Alert.alert("Delete this item?", `Remove "${item.title}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePortfolio(item.id);
            await load();
          } catch {
            Alert.alert("Couldn't delete this item. Please try again.");
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingView label="Loading your portfolio..." />;
  if (error) return <ErrorView message={error} />;

  const imageCount = items.filter((i) => i.media_type === "IMAGE").length;
  const videoCount = items.filter((i) => i.media_type === "VIDEO").length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Portfolio</Text>
        <Text style={styles.subtitle}>Showcase photos and videos of your past work.</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{imageCount}</Text>
            <Text style={styles.statLabel}>Images</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{videoCount}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Media</Text>

          <Pressable style={styles.picker} onPress={pickMedia}>
            {pickedAsset ? (
              pickedAsset.type === "video" ? (
                <View style={styles.pickedVideoPlaceholder}>
                  <Ionicons name="videocam" size={28} color={colors.primary} />
                  <Text style={styles.pickedVideoText}>Video selected</Text>
                </View>
              ) : (
                <Image source={{ uri: pickedAsset.uri }} style={styles.pickedImage} />
              )
            ) : (
              <View style={styles.pickerEmpty}>
                <Ionicons name="cloud-upload-outline" size={28} color={colors.textMuted} />
                <Text style={styles.pickerEmptyText}>Tap to choose a photo or video</Text>
              </View>
            )}
          </Pressable>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <PrimaryButton label="Upload" onPress={handleUpload} loading={uploading} />
        </View>

        <Text style={styles.sectionTitle}>Your Media ({items.length})</Text>

        {items.length === 0 ? (
          <Text style={styles.empty}>You haven't added any portfolio media yet.</Text>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => (
              <View key={item.id} style={styles.mediaCard}>
                {item.media_type === "IMAGE" ? (
                  <Image source={{ uri: resolveMediaUrl(item.media_url) }} style={styles.mediaThumb} />
                ) : item.media_type === "VIDEO" ? (
                  <View style={[styles.mediaThumb, styles.mediaPlaceholder]}>
                    <Ionicons name="videocam" size={26} color={colors.primary} />
                  </View>
                ) : (
                  <View style={[styles.mediaThumb, styles.mediaPlaceholder]}>
                    <Text style={{ fontSize: 26 }}>📦</Text>
                  </View>
                )}
                <Text style={styles.mediaTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.primary },
  statLabel: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontWeight: "700", fontSize: 16, color: colors.text, marginBottom: 12 },
  picker: {
    height: 160,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: "hidden",
    marginBottom: 12,
  },
  pickerEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  pickerEmptyText: { color: colors.textMuted, fontSize: 13 },
  pickedImage: { width: "100%", height: "100%" },
  pickedVideoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  pickedVideoText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    marginBottom: 12,
  },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 12 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  mediaCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaThumb: { width: "100%", height: 100, borderRadius: 8, backgroundColor: colors.background },
  mediaPlaceholder: { alignItems: "center", justifyContent: "center" },
  mediaTitle: { color: colors.text, fontWeight: "600", fontSize: 13, marginTop: 8 },
  deleteButton: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  deleteButtonText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
});
