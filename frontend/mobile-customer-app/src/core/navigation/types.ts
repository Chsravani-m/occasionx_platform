import type { CartItem } from "@/features/cart/cart";

export type AuthStackParamList = {
  SignIn: undefined;
  Register: undefined;
};

// Flat - there's no separate Tab.Navigator any more. The bottom tab bar
// is a custom AppFooter rendered outside the Stack.Navigator (so it -
// and AppHeader - never unmount as you push/pop screens); Home/Cart/
// MyBookings/Wishlist/Profile are just the "root" screens within this
// same stack that AppFooter's buttons jump to.
export type CustomerStackParamList = {
  Home: undefined;
  Cart: undefined;
  MyBookings: undefined;
  Browse: undefined;
  Wishlist: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  CategoryProviders: { categoryId: string; categoryName: string };
  ProviderDetails: { providerId: string };
  BookingReview: { items: CartItem[]; fromCart: boolean; directBookingId?: string };
  Notifications: undefined;
  SearchResults: { keyword?: string } | undefined;
  CollabSession: { sessionId: string };
  CollabJoin: { token?: string } | undefined;
};
