import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProviderTabs from "./ProviderTabs";
import ServicesScreen from "@/features/services/ServicesScreen";
import PricingScreen from "@/features/pricing/PricingScreen";
import SpecificationsScreen from "@/features/services/SpecificationsScreen";
import ReviewsScreen from "@/features/reviews/ReviewsScreen";
import PortfolioScreen from "@/features/portfolio/PortfolioScreen";
import CalendarScreen from "@/features/calendar/CalendarScreen";
import BookingPolicyScreen from "@/features/booking-policy/BookingPolicyScreen";
import NotificationsScreen from "@/features/notifications/NotificationsScreen";
import SettingsScreen from "@/features/settings/SettingsScreen";
import { colors } from "@/core/theme/colors";
import type { ProviderStackParamList } from "./types";

const Stack = createNativeStackNavigator<ProviderStackParamList>();

export default function ProviderStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen name="ProviderTabs" component={ProviderTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Services" component={ServicesScreen} options={{ title: "My Services" }} />
      <Stack.Screen
        name="Pricing"
        component={PricingScreen}
        options={({ route }) => ({ title: route.params.serviceName || "Pricing" })}
      />
      <Stack.Screen
        name="Specifications"
        component={SpecificationsScreen}
        options={{ title: "Specifications" }}
      />
      <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: "Reviews" }} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ title: "Portfolio" }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: "Calendar" }} />
      <Stack.Screen name="BookingPolicy" component={BookingPolicyScreen} options={{ title: "Booking Policy" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Stack.Navigator>
  );
}
