import { api } from "@/core/api/client";
import { DeviceEventEmitter } from "react-native";

export interface WishlistItem {
  id: string;
  customer_id: string;
  provider_id: string;
  created_at: string;
}

// RN has no window/localStorage events - DeviceEventEmitter is the RN
// equivalent used to notify other screens (tab badge, wishlist list)
// that a mutation happened, mirroring the web app's
// WISHLIST_UPDATED_EVENT pattern.
export const WISHLIST_UPDATED_EVENT = "wishlist-updated";

export const addToWishlist = async (
  customerId: string,
  providerId: string
): Promise<WishlistItem> => {
  const res = await api.post("/wishlist", {
    customer_id: customerId,
    provider_id: providerId,
  });
  DeviceEventEmitter.emit(WISHLIST_UPDATED_EVENT);
  return res.data;
};

export const removeFromWishlist = async (
  customerId: string,
  providerId: string
): Promise<void> => {
  await api.delete(`/wishlist/customer/${customerId}/provider/${providerId}`);
  DeviceEventEmitter.emit(WISHLIST_UPDATED_EVENT);
};

export const getCustomerWishlist = async (
  customerId: string
): Promise<WishlistItem[]> => {
  const res = await api.get(`/wishlist/customer/${customerId}`);
  return res.data;
};

export const checkWishlisted = async (
  customerId: string,
  providerId: string
): Promise<boolean> => {
  const res = await api.get(
    `/wishlist/customer/${customerId}/provider/${providerId}`
  );
  return res.data.is_wishlisted;
};
