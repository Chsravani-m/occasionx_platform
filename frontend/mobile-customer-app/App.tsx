import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/core/context/AuthContext";
import { LocationProvider } from "@/core/context/LocationContext";
import RootNavigator from "@/core/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocationProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
