import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Image } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/core/context/AuthContext";
import PrimaryButton from "@/core/components/PrimaryButton";
import { Screen } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import { API_GATEWAY_URL, WEB_APP_URL } from "@/core/api/client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "SignIn">;

export default function SignInScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const openTerms = () => {
    WebBrowser.openBrowserAsync(`${WEB_APP_URL}/terms/provider`).catch(() => {});
  };

  const openPrivacy = () => {
    WebBrowser.openBrowserAsync(`${WEB_APP_URL}/privacy`).catch(() => {});
  };

  const handleSignIn = async () => {
    setError(null);
    if (!identifier || !password) {
      setError("Enter your email/mobile and password.");
      return;
    }
    if (!agreedToTerms) {
      setError("Please read and agree to the Terms & Conditions and Privacy Policy before signing in.");
      return;
    }
    setLoading(true);
    try {
      await login(identifier, password);
      // RootNavigator switches automatically once AuthContext's user
      // state updates - no manual navigation needed here.
    } catch (e: any) {
      if (e?.response?.data?.detail) {
        setError(e.response.data.detail);
      } else if (e?.request) {
        setError(
          `Can't reach the server at ${API_GATEWAY_URL}. Make sure your phone is on the same Wi-Fi as the OccasionX servers and that they're running.`
        );
      } else {
        setError("Sign in failed. Check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Image source={require("../../../assets/logo-full.png")} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>Sign in to OccasionX for Business</Text>
        <Text style={styles.subtitle}>Manage your listing, bookings and earnings.</Text>

        <Text style={styles.label}>Email or Mobile</Text>
        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <Pressable style={styles.termsRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
          <Ionicons
            name={agreedToTerms ? "checkbox" : "square-outline"}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.termsText}>
            I have read and agree to the{" "}
            <Text style={styles.termsLink} onPress={openTerms}>
              Terms & Conditions
            </Text>{" "}
            and{" "}
            <Text style={styles.termsLink} onPress={openPrivacy}>
              Privacy Policy
            </Text>
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Sign In" onPress={handleSignIn} loading={loading} style={styles.button} />

        <Pressable onPress={() => navigation.navigate("ProviderRegister")} style={styles.linkWrap}>
          <Text style={styles.link}>New provider? Register your business</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  logo: { width: 140, height: 41, alignSelf: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: 6 },
  subtitle: { color: colors.textMuted, marginBottom: 24 },
  label: { color: colors.text, marginBottom: 6, marginTop: 12, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: { color: colors.danger, marginTop: 12 },
  button: { marginTop: 24 },
  linkWrap: { marginTop: 16, alignItems: "center" },
  link: { color: colors.primary, fontWeight: "500" },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 20 },
  termsText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18 },
  termsLink: { color: colors.primary, fontWeight: "600" },
});
