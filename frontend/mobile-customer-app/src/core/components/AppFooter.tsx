import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Image, DeviceEventEmitter } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/core/theme/colors";
import { useAuth } from "@/core/context/AuthContext";
import { getCart, CART_UPDATED_EVENT } from "@/features/cart/cart";
import { navigateTo } from "@/core/navigation/navigationRef";
import type { CustomerStackParamList } from "@/core/navigation/types";

type TabName = "Home" | "Cart" | "MyBookings" | "Browse" | "Profile";

const TAB_LABELS: Record<TabName, string> = {
  Home: "Home",
  Cart: "Cart",
  MyBookings: "Bookings",
  Browse: "Browse",
  Profile: "Profile",
};

// Rendered once, as a sibling of the Stack.Navigator (see RootNavigator),
// so this bottom bar - and its badges - never unmount as you push/pop
// screens (CategoryProviders, ProviderDetails, SearchResults, etc. used
// to hide it entirely because those screens lived outside the old
// Tab.Navigator). Replaces CustomerTabs.tsx's built-in tab bar.
export default function AppFooter({ activeRoute }: { activeRoute?: string }) {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(() => {
    if (!user?.id) {
      setCartCount(0);
      return;
    }
    getCart(user.id)
      .then((items) => setCartCount(items.length))
      .catch(() => setCartCount(0));
  }, [user?.id]);

  useEffect(() => {
    refreshCartCount();
    const cartSub = DeviceEventEmitter.addListener(CART_UPDATED_EVENT, refreshCartCount);
    return () => {
      cartSub.remove();
    };
  }, [refreshCartCount]);

  const go = (name: TabName) => navigateTo(name as keyof CustomerStackParamList, undefined as never);

  return (
    <View style={styles.wrap}>
      <FooterButton active={activeRoute === "Home"} onPress={() => go("Home")} label={TAB_LABELS.Home}>
        <Image source={require("../../../assets/icon.png")} style={styles.logoIcon} resizeMode="contain" />
      </FooterButton>

      <FooterButton
        active={activeRoute === "Cart"}
        onPress={() => go("Cart")}
        label={TAB_LABELS.Cart}
        badge={cartCount}
      >
        <Ionicons
          name={activeRoute === "Cart" ? "cart" : "cart-outline"}
          size={23}
          color={activeRoute === "Cart" ? colors.primary : colors.textMuted}
        />
      </FooterButton>

      <FooterButton
        active={activeRoute === "MyBookings"}
        onPress={() => go("MyBookings")}
        label={TAB_LABELS.MyBookings}
      >
        <Ionicons
          name={activeRoute === "MyBookings" ? "calendar" : "calendar-outline"}
          size={23}
          color={activeRoute === "MyBookings" ? colors.primary : colors.textMuted}
        />
      </FooterButton>

      <FooterButton active={activeRoute === "Browse"} onPress={() => go("Browse")} label={TAB_LABELS.Browse}>
        <Ionicons
          name={activeRoute === "Browse" ? "grid" : "grid-outline"}
          size={23}
          color={activeRoute === "Browse" ? colors.primary : colors.textMuted}
        />
      </FooterButton>

      <FooterButton active={activeRoute === "Profile"} onPress={() => go("Profile")} label={TAB_LABELS.Profile}>
        <Ionicons
          name={activeRoute === "Profile" ? "person" : "person-outline"}
          size={23}
          color={activeRoute === "Profile" ? colors.primary : colors.textMuted}
        />
      </FooterButton>
    </View>
  );
}

function FooterButton({
  children,
  label,
  active,
  onPress,
  badge,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable style={styles.button} onPress={onPress} hitSlop={4}>
      <View style={styles.iconWrap}>
        {children}
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 8,
  },
  button: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconWrap: { position: "relative" },
  logoIcon: { width: 24, height: 24, borderRadius: 6 },
  label: { fontSize: 11, color: colors.textMuted, marginTop: 3, fontWeight: "500" },
  labelActive: { color: colors.primary, fontWeight: "700" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
