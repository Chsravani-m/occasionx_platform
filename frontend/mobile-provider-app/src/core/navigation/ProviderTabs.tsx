import React from "react";
import { Image } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "@/features/dashboard/DashboardScreen";
import ProviderBookingsScreen from "@/features/bookings/BookingsScreen";
import EarningsScreen from "@/features/earnings/EarningsScreen";
import BankDetailsScreen from "@/features/bank-details/BankDetailsScreen";
import { colors } from "@/core/theme/colors";
import type { ProviderTabParamList } from "./types";

const Tab = createBottomTabNavigator<ProviderTabParamList>();

const ICONS: Record<keyof ProviderTabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "grid-outline",
  ProviderBookings: "calendar-outline",
  Earnings: "cash-outline",
  BankDetails: "card-outline",
};

export default function ProviderTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof ProviderTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitleAlign: "center",
          // The OX logo in place of a plain "Dashboard" text title,
          // matching the persistent branded header the customer app
          // uses (see mobile-customer-app/src/components/AppHeader.tsx).
          headerTitle: () => (
            <Image
              source={require("../../../assets/logo-full.png")}
              style={{ width: 120, height: 35 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen name="ProviderBookings" component={ProviderBookingsScreen} options={{ title: "Bookings" }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="BankDetails" component={BankDetailsScreen} options={{ title: "Bank Details" }} />
    </Tab.Navigator>
  );
}
