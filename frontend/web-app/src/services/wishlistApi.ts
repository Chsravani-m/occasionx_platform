import { api } from "@/lib/apiClient";

export interface WishlistItem {
  id: string;
  customer_id: string;
  provider_id: string;
  created_at: string;
}

// Wishlist lives in the backend, not localStorage, so there's no
// "storage" event to piggyback on the way cart's badge does (see
// utils/cart.ts's CART_UPDATED_EVENT). Header.tsx only ever fetched
// the count once on login and had no way to find out a wishlist
// mutation happened elsewhere (CartPage's "move to wishlist", the
// heart button on ProviderHero, the Wishlist page itself) - dispatched
// here, in the one place every add/remove already funnels through, so
// every call site gets it for free.
export const WISHLIST_UPDATED_EVENT = "wishlist-updated";

export const addToWishlist = async (
  customerId: string,
  providerId: string
): Promise<WishlistItem> => {
  const res = await api.post("/wishlist", {
    customer_id: customerId,
    provider_id: providerId,
  });

  window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));

  return res.data;
};

export const removeFromWishlist = async (
  customerId: string,
  providerId: string
): Promise<void> => {
  await api.delete(
    `/wishlist/customer/${customerId}/provider/${providerId}`
  );

  window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
};

export const getCustomerWishlist = async (
  customerId: string
): Promise<WishlistItem[]> => {
  const res = await api.get(
    `/wishlist/customer/${customerId}`
  );

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
