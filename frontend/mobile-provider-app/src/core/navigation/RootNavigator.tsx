import React, { useEffect } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "@/core/context/AuthContext";
import AuthStack from "./AuthStack";
import ProviderStack from "./ProviderStack";
import { LoadingView } from "@/core/components/Screen";

export default function RootNavigator() {
  const { user, loading, logout } = useAuth();

  // This app is provider-only - the customer experience lives in the
  // separate OccasionX app. A USER account can still authenticate
  // against the shared backend from here (same login endpoint for
  // every role), so catch it after the fact and bounce back to
  // sign-in rather than rendering a provider dashboard a customer
  // account has no use for.
  useEffect(() => {
    if (user && user.role !== "PROVIDER") {
      logout();
      Alert.alert(
        "Wrong app",
        "This is the OccasionX for Business app. Please use the OccasionX app to book services as a customer."
      );
    }
  }, [user, logout]);

  if (loading) {
    return <LoadingView label="Loading OccasionX for Business..." />;
  }

  return (
    <NavigationContainer>
      {!user || user.role !== "PROVIDER" ? <AuthStack /> : <ProviderStack />}
    </NavigationContainer>
  );
}
