import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Image, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  uploadProviderDocument,
  createRegistrationPayment,
  markRegistrationPaid,
  verifyRegistrationPayment,
  DocumentType,
} from "@/features/registration/providerRegistrationApi";
import type { RNFile } from "@/features/portfolio/providerPortfolioApi";
import { RAZORPAY_KEY_ID } from "@/core/api/client";
import PaymentWebView, { RazorpaySuccess } from "@/core/components/PaymentWebView";
import PrimaryButton from "@/core/components/PrimaryButton";
import { Screen } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "ProviderSetup">;

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "GST_CERTIFICATE", label: "GST Certificate" },
  { value: "PAN_CARD", label: "PAN Card" },
  { value: "AADHAAR", label: "Aadhaar" },
  { value: "BUSINESS_LICENSE", label: "Business License" },
];

export default function ProviderSetupScreen({ route, navigation }: Props) {
  const { providerId, businessName } = route.params;

  const [step, setStep] = useState<"documents" | "payment" | "done">("documents");

  // Only ever populated in test mode - see markRegistrationPaid in
  // providerRegistrationApi.ts. Test registrations routinely use fake
  // email addresses, so there's no real inbox to check; surfacing the
  // link directly lets testing continue without digging through
  // server logs/DB for the activation token (mirrors web's
  // SubscriptionSection.tsx).
  const [activationLink, setActivationLink] = useState<string | null>(null);

  // Documents
  const [docType, setDocType] = useState<DocumentType>("GST_CERTIFICATE");
  const [docAsset, setDocAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadedTypes, setUploadedTypes] = useState<Set<DocumentType>>(new Set());
  const [uploading, setUploading] = useState(false);

  // Payment
  const [payLoading, setPayLoading] = useState(false);
  const [payment, setPayment] = useState<{
    visible: boolean;
    orderId: string;
    amount: number;
    currency: string;
  } | null>(null);

  const pickDocumentPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach a document.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;
    setDocAsset(result.assets[0]);
  };

  const handleUploadDocument = async () => {
    if (!docAsset) {
      Alert.alert("Please attach a photo of the document first");
      return;
    }
    const uriParts = docAsset.uri.split(".");
    const ext = uriParts[uriParts.length - 1] || "jpg";
    const file: RNFile = {
      uri: docAsset.uri,
      name: docAsset.fileName || `${docType.toLowerCase()}.${ext}`,
      type: docAsset.mimeType || `image/${ext}`,
    };
    try {
      setUploading(true);
      await uploadProviderDocument(providerId, docType, file);
      setUploadedTypes((prev) => new Set(prev).add(docType));
      setDocAsset(null);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.response?.data?.detail || "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleStartPayment = async () => {
    try {
      setPayLoading(true);
      const order = await createRegistrationPayment(providerId);

      if (order.test_mode) {
        // Dev/test mode: no real Razorpay order exists - confirm the
        // fee directly instead of opening checkout, same shortcut the
        // web app uses (see providerRegistrationApi.ts).
        const result = await markRegistrationPaid(providerId);
        if (result.activation_link) setActivationLink(result.activation_link);
        setStep("done");
        return;
      }

      setPayment({
        visible: true,
        orderId: order.order_id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (e: any) {
      Alert.alert(
        "Couldn't start payment",
        e?.response?.data?.detail || "Please try again in a moment."
      );
    } finally {
      setPayLoading(false);
    }
  };

  const handlePaymentSuccess = async (result: RazorpaySuccess) => {
    setPayment(null);
    try {
      await verifyRegistrationPayment(providerId, {
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });
      setStep("done");
    } catch {
      Alert.alert("Payment verification failed", "Please contact support if the amount was deducted.");
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{businessName}</Text>
        <Text style={styles.subtitle}>
          {step === "documents"
            ? "Upload your KYC documents (you can also do this later)."
            : step === "payment"
            ? "One-time registration fee to activate your account."
            : "You're almost there!"}
        </Text>

        {step === "documents" && (
          <>
            <Text style={styles.label}>Document Type</Text>
            <View style={styles.chipRow}>
              {DOCUMENT_TYPES.map((d) => (
                <Pressable
                  key={d.value}
                  style={[styles.chip, docType === d.value && styles.chipActive]}
                  onPress={() => setDocType(d.value)}
                >
                  <Text style={[styles.chipText, docType === d.value && styles.chipTextActive]}>
                    {d.label}
                  </Text>
                  {uploadedTypes.has(d.value) && (
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginLeft: 4 }} />
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.picker} onPress={pickDocumentPhoto}>
              {docAsset ? (
                <Image source={{ uri: docAsset.uri }} style={styles.pickedImage} />
              ) : (
                <View style={styles.pickerEmpty}>
                  <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
                  <Text style={styles.pickerEmptyText}>Tap to attach a photo of this document</Text>
                </View>
              )}
            </Pressable>

            <PrimaryButton
              label="Upload Document"
              onPress={handleUploadDocument}
              loading={uploading}
              style={styles.button}
            />

            <PrimaryButton
              label="Continue to Registration Fee"
              onPress={() => setStep("payment")}
              variant="outline"
              style={styles.button}
            />
          </>
        )}

        {step === "payment" && (
          <>
            <View style={styles.feeCard}>
              <Text style={styles.feeLabel}>Registration Fee</Text>
              <Text style={styles.feeAmount}>One-time payment to activate your provider account</Text>
            </View>
            <PrimaryButton
              label="Pay Registration Fee"
              onPress={handleStartPayment}
              loading={payLoading}
              style={styles.button}
            />
            <PrimaryButton
              label="Back"
              onPress={() => setStep("documents")}
              variant="outline"
              style={styles.button}
            />
          </>
        )}

        {step === "done" && (
          <View style={styles.doneCard}>
            <Ionicons name="mail-outline" size={40} color={colors.primary} />
            <Text style={styles.doneTitle}>Check your email</Text>
            <Text style={styles.doneText}>
              We've sent an activation link to your email. Click it to activate your account, then sign
              in below.
            </Text>

            {activationLink && (
              <View style={styles.testModeBox}>
                <Text style={styles.testModeLabel}>
                  Test mode - no real email was sent. Activate your account here:
                </Text>
                <Pressable onPress={() => Linking.openURL(activationLink)}>
                  <Text style={styles.testModeLink}>{activationLink}</Text>
                </Pressable>
              </View>
            )}

            <PrimaryButton
              label="Go to Sign In"
              onPress={() => navigation.reset({ index: 0, routes: [{ name: "SignIn" }] })}
              style={styles.button}
            />
          </View>
        )}
      </ScrollView>

      {payment && (
        <PaymentWebView
          visible={payment.visible}
          keyId={RAZORPAY_KEY_ID}
          amount={payment.amount}
          currency={payment.currency}
          orderId={payment.orderId}
          description="Provider Registration Fee"
          onSuccess={handlePaymentSuccess}
          onDismiss={() => setPayment(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  subtitle: { color: colors.textMuted, marginBottom: 20 },
  label: { color: colors.text, marginBottom: 8, fontWeight: "500" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
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
  picker: {
    height: 140,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginBottom: 12,
  },
  pickerEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  pickerEmptyText: { color: colors.textMuted, fontSize: 13, textAlign: "center", paddingHorizontal: 20 },
  pickedImage: { width: "100%", height: "100%" },
  button: { marginTop: 12 },
  feeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  feeLabel: { fontSize: 18, fontWeight: "700", color: colors.text },
  feeAmount: { color: colors.textMuted, fontSize: 13, marginTop: 6, textAlign: "center" },
  doneCard: { alignItems: "center", paddingVertical: 30 },
  doneTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 12 },
  doneText: { color: colors.textMuted, textAlign: "center", marginTop: 8, paddingHorizontal: 10 },
  testModeBox: {
    marginTop: 16,
    width: "100%",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: 12,
  },
  testModeLabel: { fontSize: 12, color: "#92400E" },
  testModeLink: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
