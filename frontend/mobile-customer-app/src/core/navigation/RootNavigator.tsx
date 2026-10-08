import React, { useCallback, useEffect, useState } from "react";
import { Alert, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "@/core/context/AuthContext";
import AuthStack from "./AuthStack";
import CustomerStack from "./CustomerStack";
import { navigationRef } from "./navigationRef";
import AppHeader from "@/core/components/AppHeader";
import AppFooter from "@/core/components/AppFooter";
import { LoadingView } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";

// This app is customer-only - the provider dashboard lives in the
// separate OccasionX for Business app. A PROVIDER account can still
// authenticate against the shared backend from here (same login
// endpoint for every role), so catch it after the fact and bounce
// back to sign-in rather than rendering a customer UI a provider
// account has no use for.
export default function RootNavigator() {
  const { user, loading, logout } = useAuth();
  const [routeName, setRouteName] = useState<string | undefined>();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (user?.role === "PROVIDER") {
      logout();
      Alert.alert(
        "Wrong app",
        "This is the OccasionX customer app. Please use the OccasionX for Business app to manage your provider account."
      );
    }
  }, [user, logout]);

  // AppHeader (back button) and AppFooter (active tab highlight) live
  // outside the Stack.Navigator, so they can't read the current route
  // via useRoute()/useNavigationState() - track it here instead and
  // pass it down as plain props.
  const syncNavState = useCallback(() => {
    if (!navigationRef.isReady()) return;
    setRouteName(navigationRef.getCurrentRoute()?.name);
    setCanGoBack(navigationRef.canGoBack());
  }, []);

  if (loading) {
    return <LoadingView label="Loading OccasionX..." />;
  }

  const isCustomer = !!user && user.role !== "PROVIDER";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <NavigationContainer ref={navigationRef} onReady={syncNavState} onStateChange={syncNavState}>
        {isCustomer ? (
          <>
            <AppHeader canGoBack={canGoBack} />
            <View style={styles.content}>
              <CustomerStack />
            </View>
            <AppFooter activeRoute={routeName} />
          </>
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
});
