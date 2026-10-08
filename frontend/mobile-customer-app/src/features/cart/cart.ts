import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import { calculateEstimatedCost, calculateNumDays, getEffectiveQuantity } from "@/features/providers/pricing";

// RN equivalent of the web app's per-customer localStorage cart
// (ox_cart_<customerId>) - same shape, same per-customer key, just
// backed by AsyncStorage instead of localStorage since RN has no DOM
// storage API.
export interface CartItem {
  provider_id: string;
  provider_name: string;
  service_id: string;
  service_name: string;
  pricing_id: string;
  pricing_type: string;
  price: number;
  unit?: string;
  category_id?: string;
  category_name?: string;
  event_date: string;
  event_time?: string;
  guest_count: number;
  min_quantity?: number;
  max_quantity?: number;
  occupancy_per_room?: number | null;
  rating?: number;
  // Check-out date + room count for Accommodation (PER_DAY) services -
  // without these, POST /bookings prices the stay as a single night
  // and can't tell how many rooms were requested (see MC-15).
  event_end_date?: string;
  quantity?: number;
  total_rooms?: number | null;
}

export const CART_UPDATED_EVENT = "cart-updated";

function cartKey(customerId: string) {
  return `ox_cart_${customerId}`;
}

export async function getCart(customerId: string): Promise<CartItem[]> {
  const raw = await AsyncStorage.getItem(cartKey(customerId));
  return raw ? (JSON.parse(raw) as CartItem[]) : [];
}

async function saveCart(customerId: string, items: CartItem[]) {
  await AsyncStorage.setItem(cartKey(customerId), JSON.stringify(items));
  DeviceEventEmitter.emit(CART_UPDATED_EVENT);
}

export async function addToCart(customerId: string, item: CartItem) {
  const items = await getCart(customerId);
  items.push(item);
  await saveCart(customerId, items);
  return items;
}

export async function removeFromCart(customerId: string, index: number) {
  const items = await getCart(customerId);
  items.splice(index, 1);
  await saveCart(customerId, items);
  return items;
}

export async function updateCartItem(
  customerId: string,
  index: number,
  patch: Partial<CartItem>
) {
  const items = await getCart(customerId);
  if (items[index]) {
    items[index] = { ...items[index], ...patch };
  }
  await saveCart(customerId, items);
  return items;
}

export async function clearCart(customerId: string) {
  await AsyncStorage.removeItem(cartKey(customerId));
  DeviceEventEmitter.emit(CART_UPDATED_EVENT);
}

// Same min/max_quantity floor logic as the web app (utils in
// web-app/src/components/package-builder) - a PER_PLATE/PER_PERSON
// price is multiplied by guest_count, but never priced below
// min_quantity plates/people even if fewer guests are entered, and
// never above max_quantity.
export function effectiveQuantity(item: CartItem): number {
  return getEffectiveQuantity(item.guest_count || 1, item.min_quantity, item.max_quantity);
}

// Handles all pricing types now, not just PER_PLATE/PER_PERSON -
// PER_DAY (Accommodation) used to silently fall through to a flat
// item.price, ignoring both the number of nights (event_end_date) and
// the number of rooms (quantity) requested. See MC-15.
export function itemTotal(item: CartItem): number {
  return calculateEstimatedCost(
    item.price,
    item.pricing_type,
    item.guest_count,
    item.min_quantity,
    item.max_quantity,
    calculateNumDays(item.event_date, item.event_end_date),
    item.quantity
  );
}
