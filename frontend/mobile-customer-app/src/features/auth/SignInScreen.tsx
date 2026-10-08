import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Image, Linking, Alert } from "react-native";
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

  const openLegalPage = (path: string) => {
    Linking.openURL(`${WEB_APP_URL}${path}`).catch(() => {
      Alert.alert("Couldn't open that page. Please try again.");
    });
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
        // Backend reached and rejected the login (wrong password,
        // unverified email, etc.) - show its actual reason.
        setError(e.response.data.detail);
      } else if (e?.request) {
        // Request went out but got no response at all - almost always
        // means the phone can't reach API_GATEWAY_URL (wrong/stale LAN
        // IP in app.json's expo.extra.apiGatewayUrl, not on the same
        // Wi-Fi, or the backend servers aren't running), not a bad
        // password. See src/api/client.ts.
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

        <Text style={styles.title}>Sign in to OccasionX</Text>
        <Text style={styles.subtitle}>Manage your bookings, wishlist and events.</Text>

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
            <Text style={styles.termsLink} onPress={() => openLegalPage("/terms")}>
              Terms & Conditions
            </Text>{" "}
            and{" "}
            <Text style={styles.termsLink} onPress={() => openLegalPage("/privacy")}>
              Privacy Policy
            </Text>
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Sign In" onPress={handleSignIn} loading={loading} style={styles.button} />

        <Pressable onPress={() => navigation.navigate("Register")} style={styles.linkWrap}>
          <Text style={styles.link}>Don't have an account? Register</Text>
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
