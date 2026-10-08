import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, Pressable } from "react-native";
import {
  getBankDetails,
  updateBankDetails,
  getRazorpayAccountStatus,
  setupRazorpayAccount,
  RazorpayAccountStatus,
} from "@/features/bank-details/providerBankApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";

const BUSINESS_TYPE_OPTIONS = [
  { value: "individual", label: "Individual" },
  { value: "proprietorship", label: "Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "huf", label: "HUF" },
  { value: "private_limited", label: "Private Limited" },
  { value: "public_limited", label: "Public Limited" },
  { value: "llp", label: "LLP" },
  { value: "ngo", label: "NGO" },
  { value: "trust", label: "Trust" },
  { value: "society", label: "Society" },
  { value: "not_yet_registered", label: "Not Yet Registered" },
];

export default function BankDetailsScreen() {
  const { user } = useAuth();
  const providerId = (user as any)?.provider_id || user?.id;

  const [holder, setHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routeStatus, setRouteStatus] = useState<RazorpayAccountStatus | null>(null);

  // Razorpay Route linked-account setup - separate from the plain
  // bank-details form above, since this actually calls Razorpay's
  // live API to create/activate a linked account.
  const [panNumber, setPanNumber] = useState("");
  const [businessType, setBusinessType] = useState("individual");
  const [businessCategory, setBusinessCategory] = useState("services");
  const [businessSubcategory, setBusinessSubcategory] = useState("event_management");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [settingUp, setSettingUp] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    Promise.all([getBankDetails(providerId), getRazorpayAccountStatus(providerId)])
      .then(([bank, route]) => {
        setHolder(bank.bank_account_holder_name || "");
        setAccountNumber(bank.bank_account_number || "");
        setIfsc(bank.bank_ifsc_code || "");
        setBankName(bank.bank_name || "");
        setRouteStatus(route);
      })
      .finally(() => setLoading(false));
  }, [providerId]);

  if (loading) return <LoadingView label="Loading bank details..." />;

  const activated = routeStatus?.razorpay_account_status === "activated";
  const linkedAccountId = routeStatus?.razorpay_linked_account_id;
  const requirements = routeStatus?.razorpay_account_requirements || [];

  const handleSave = async () => {
    if (!providerId) return;
    setSaving(true);
    try {
      await updateBankDetails(providerId, {
        bank_account_holder_name: holder,
        bank_account_number: accountNumber,
        bank_ifsc_code: ifsc,
        bank_name: bankName,
      });
      Alert.alert("Saved", "Your bank details were updated.");
    } catch {
      Alert.alert("Error", "Couldn't save your bank details.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetupPayouts = async () => {
    if (!providerId) return;

    if (
      !panNumber.trim() ||
      !businessType ||
      !businessCategory.trim() ||
      !businessSubcategory.trim() ||
      !addressLine1.trim() ||
      !city.trim() ||
      !stateName.trim() ||
      !postalCode.trim()
    ) {
      Alert.alert("Missing info", "Please fill in all the fields below.");
      return;
    }

    if (!holder.trim() || !accountNumber.trim() || !ifsc.trim()) {
      Alert.alert(
        "Save bank details first",
        "Automatic payouts need an account to pay out to - please save your bank details above first."
      );
      return;
    }

    setSettingUp(true);
    try {
      const result = await setupRazorpayAccount(providerId, {
        pan_number: panNumber.trim().toUpperCase(),
        business_type: businessType,
        business_category: businessCategory.trim(),
        business_subcategory: businessSubcategory.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: stateName.trim(),
        postal_code: postalCode.trim(),
      });
      setRouteStatus(result);
      Alert.alert("Submitted", "Submitted to Razorpay. See the status below for what's next.");
    } catch (err: any) {
      const message = err?.response?.data?.detail || "Couldn't set up automatic payouts. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setSettingUp(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Bank Details</Text>

        <View style={styles.routeBadge}>
          <Text style={styles.routeText}>Automatic Payouts: {activated ? "Activated" : "Not set up yet"}</Text>
        </View>

        <Text style={styles.label}>Account Holder Name</Text>
        <TextInput style={styles.input} value={holder} onChangeText={setHolder} />

        <Text style={styles.label}>Account Number</Text>
        <TextInput
          style={styles.input}
          value={accountNumber}
          onChangeText={setAccountNumber}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>IFSC Code</Text>
        <TextInput style={styles.input} value={ifsc} onChangeText={setIfsc} autoCapitalize="characters" />

        <Text style={styles.label}>Bank Name</Text>
        <TextInput style={styles.input} value={bankName} onChangeText={setBankName} />

        <PrimaryButton label="Save Bank Details" onPress={handleSave} loading={saving} style={styles.saveButton} />

        <View style={styles.divider} />

        <Text style={styles.title}>Automatic Payouts</Text>
        <Text style={styles.helper}>
          This sets up a Razorpay linked account in your business's name, so booking payments split
          straight to the bank account above instead of being settled manually. This is a one-time
          business/KYC form - Razorpay may still ask for identity or address documents afterwards,
          which you'll need to complete directly with them.
        </Text>

        {linkedAccountId && (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>Status: {routeStatus?.razorpay_account_status || "created"}</Text>
            {requirements.length > 0 && (
              <Text style={styles.statusText}>Razorpay still needs: {requirements.join(", ")}</Text>
            )}
          </View>
        )}

        <Text style={styles.label}>PAN Number</Text>
        <TextInput
          style={styles.input}
          value={panNumber}
          onChangeText={setPanNumber}
          autoCapitalize="characters"
          placeholder="e.g. ABCDE1234F"
        />

        <Text style={styles.label}>Business Type</Text>
        <View style={styles.chipRow}>
          {BUSINESS_TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, businessType === opt.value && styles.chipActive]}
              onPress={() => setBusinessType(opt.value)}
            >
              <Text style={[styles.chipText, businessType === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Business Category</Text>
        <TextInput style={styles.input} value={businessCategory} onChangeText={setBusinessCategory} />

        <Text style={styles.label}>Business Subcategory</Text>
        <TextInput style={styles.input} value={businessSubcategory} onChangeText={setBusinessSubcategory} />

        <Text style={styles.label}>Business Address</Text>
        <TextInput
          style={styles.input}
          value={addressLine1}
          onChangeText={setAddressLine1}
          placeholder="Address line 1"
        />
        <TextInput
          style={[styles.input, styles.inputSpaced]}
          value={addressLine2}
          onChangeText={setAddressLine2}
          placeholder="Address line 2 (optional)"
        />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} />

        <Text style={styles.label}>State</Text>
        <TextInput style={styles.input} value={stateName} onChangeText={setStateName} />

        <Text style={styles.label}>PIN Code</Text>
        <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" />

        <PrimaryButton
          label={settingUp ? "Setting Up..." : linkedAccountId ? "Update Automatic Payout Details" : "Set Up Automatic Payouts"}
          onPress={handleSetupPayouts}
          loading={settingUp}
          style={styles.saveButton}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 16 },
  routeBadge: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeText: { color: colors.text, fontWeight: "500" },
  label: { color: colors.text, fontWeight: "500", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputSpaced: { marginTop: 8 },
  saveButton: { marginTop: 24 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 32,
    marginBottom: 24,
  },
  helper: { color: colors.textMuted, marginBottom: 8, lineHeight: 20 },
  statusBox: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statusText: { color: colors.text, fontSize: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
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
});
