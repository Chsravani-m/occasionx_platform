import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, Image } from "react-native";
import { register } from "@/features/auth/authApi";
import PrimaryButton from "@/core/components/PrimaryButton";
import { Screen } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    if (!fullName || !email || !mobile || !password) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      await register(fullName, email, mobile, password);
      Alert.alert(
        "Check your email",
        "We've sent a verification link to your email. Verify it, then sign in.",
        [{ text: "OK", onPress: () => navigation.navigate("SignIn") }]
      );
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require("../../../assets/logo-full.png")} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>Create your OccasionX account</Text>
        <Text style={styles.subtitle}>
          Are you a service provider? Download OccasionX for Business to register your listing
          instead.
        </Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Mobile</Text>
        <TextInput style={styles.input} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Register" onPress={handleRegister} loading={loading} style={styles.button} />
        <PrimaryButton
          label="Already have an account? Sign In"
          onPress={() => navigation.navigate("SignIn")}
          variant="outline"
          style={styles.button}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  logo: { width: 140, height: 41, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginBottom: 16 },
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
  button: { marginTop: 16 },
});
