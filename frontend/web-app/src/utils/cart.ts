import type { PackageProvider } from "@/types/package";

// localStorage writes don't fire a "storage" event in the same tab that
// wrote them, so we dispatch this custom event ourselves whenever the
// cart changes - Header.tsx listens for it to keep the badge in sync.
export const CART_UPDATED_EVENT = "cart-updated";

export type CartItem = PackageProvider;

// Cart is stored per-user (ox_cart_<user id>), not under one shared key.
// Two reasons:
//   1. A logged-out visitor on a shared browser must never see someone
//      else's cart contents.
//   2. Logging out and back in as the same person should NOT lose their
//      cart - it should still be there, tied to their account, not
//      wiped just because they logged out in between.
// A single global key couldn't satisfy both at once (clearing it on
// logout fixed #1 but broke #2). Namespacing by user id fixes both:
// nothing is visible while logged out, and each account's cart persists
// independently under its own key.
function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;

    const user = JSON.parse(raw);
    return user?.id || null;
  } catch {
    return null;
  }
}

function cartKey(): string | null {
  const userId = getCurrentUserId();
  return userId ? `ox_cart_${userId}` : null;
}

function readCart(): CartItem[] {
  const key = cartKey();
  if (!key) return [];

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  const key = cartKey();
  if (!key) return;

  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function getCart(): CartItem[] {
  return readCart();
}

export function getCartCount(): number {
  return readCart().length;
}

export function isInCart(serviceId: string): boolean {
  return readCart().some(
    (item) => item.service_id === serviceId
  );
}

export function addToCart(item: CartItem) {
  const items = readCart();

  if (
    items.some(
      (existing) => existing.service_id === item.service_id
    )
  ) {
    return;
  }

  writeCart([...items, item]);
}

// Lets the cart page edit a single item's own date/quantity in place
// (e.g. Event Date, Check-out Date, Rooms, or People) without
// disturbing the rest of the cart - used so those details can be set
// once on the cart page itself instead of being asked for again on
// the booking review page.
export function updateCartItem(
  serviceId: string,
  patch: Partial<CartItem>
) {
  writeCart(
    readCart().map((item) =>
      item.service_id === serviceId ? { ...item, ...patch } : item
    )
  );
}

export function removeFromCart(serviceId: string) {
  writeCart(
    readCart().filter(
      (item) => item.service_id !== serviceId
    )
  );
}

export function clearCart() {
  writeCart([]);
}
