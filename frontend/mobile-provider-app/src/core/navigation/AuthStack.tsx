import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignInScreen from "@/features/auth/SignInScreen";
// The old 2-step ProviderRegisterScreen never collected phone-OTP
// verification, so every submission 422'd against auth-service's
// required phone_verification_token (see providerOnboardingApi.ts) -
// replaced with the full 7-tab wizard mirroring web's
// ProviderRegistrationWizard.tsx (Business Info, Contact+OTP, Location,
// Services, Pricing, Availability, KYC), which hands off to the
// existing ProviderSetupScreen below for documents + registration fee.
import ProviderRegistrationWizard from "@/features/registration/ProviderRegistrationWizard";
import ProviderSetupScreen from "@/features/registration/ProviderSetupScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ProviderRegister" component={ProviderRegistrationWizard} />
      <Stack.Screen name="ProviderSetup" component={ProviderSetupScreen} />
    </Stack.Navigator>
  );
}
