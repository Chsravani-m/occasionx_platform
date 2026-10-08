import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "@/features/home/HomeScreen";
import CartScreen from "@/features/cart/CartScreen";
import MyBookingsScreen from "@/features/booking/MyBookingsScreen";
import BrowseScreen from "@/features/browse/BrowseScreen";
import WishlistScreen from "@/features/wishlist/WishlistScreen";
import ProfileScreen from "@/features/profile/ProfileScreen";
import EditProfileScreen from "@/features/profile/EditProfileScreen";
import SettingsScreen from "@/features/profile/SettingsScreen";
import CategoryProvidersScreen from "@/features/browse/CategoryProvidersScreen";
import ProviderDetailsScreen from "@/features/providers/ProviderDetailsScreen";
import BookingReviewScreen from "@/features/booking/BookingReviewScreen";
import NotificationsScreen from "@/features/notifications/NotificationsScreen";
import SearchResultsScreen from "@/features/search/SearchResultsScreen";
import CollabSessionScreen from "@/features/collab-session/CollabSessionScreen";
import JoinSessionScreen from "@/features/collab-session/JoinSessionScreen";
import type { CustomerStackParamList } from "./types";

const Stack = createNativeStackNavigator<CustomerStackParamList>();

// Flat stack - AppHeader/AppFooter (rendered around this in
// RootNavigator) supply all chrome now, so every screen here is
// headerShown: false. Home/Cart/MyBookings/Wishlist/Profile used to
// live inside a separate Tab.Navigator (CustomerTabs); folding them in
// here as ordinary screens is what keeps the sticky header/footer
// mounted while navigating between them and the detail screens - see
// navigation/types.ts for the full rationale.
export default function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
      <Stack.Screen name="Browse" component={BrowseScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CategoryProviders" component={CategoryProvidersScreen} />
      <Stack.Screen name="ProviderDetails" component={ProviderDetailsScreen} />
      <Stack.Screen name="BookingReview" component={BookingReviewScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="CollabSession" component={CollabSessionScreen} />
      <Stack.Screen name="CollabJoin" component={JoinSessionScreen} />
    </Stack.Navigator>
  );
}
