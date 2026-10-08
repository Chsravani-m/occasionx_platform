"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast, useConfirm } from "@/context/NotificationContext";
import Link from "next/link";
import { Heart, Trash2, Users } from "lucide-react";

import { BookingReview } from "@/components/package-builder/BookingReview";
import {
  calculateEstimatedCost,
  calculateNumDays,
  isAccommodationService,
  isGroomingService,
  isPerUnitPricing,
  suggestedQuantityFor,
  MAX_PEOPLE_QUANTITY,
} from "@/utils/pricing";
import { addToWishlist } from "@/services/wishlistApi";
import { getCurrentUser } from "@/utils/auth";
import {
  getCart,
  removeFromCart,
  updateCartItem,
  type CartItem,
} from "@/utils/cart";
import { getEarliestBookableDate, getLatestBookableDate } from "@/utils/bookingRules";
import { createCollabSession } from "@/services/collabApi";
import { setActiveCollabSession } from "@/utils/collabSession";

export function CartPage() {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [guestCount, setGuestCount] = useState(100);
  const [loaded, setLoaded] = useState(false);
  const [startingSession, setStartingSession] = useState(false);

  // The services currently being booked - either every item in the
  // cart (bulk "Continue to Booking") or just one (per-item "Book"
  // button), keyed the same way BookingReview expects.
  const [reviewingServices, setReviewingServices] = useState<Record<
    string,
    CartItem
  > | null>(null);

  const [wishlistBusyId, setWishlistBusyId] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Cart items are only ever added while signed in, and are cleared
    // on logout - but as a second layer of protection (e.g. a
    // different person using the same browser without logging out
    // first), don't show cart contents at all to a logged-out visitor.
    const user = getCurrentUser();

    if (!user?.id) {
      window.location.href = "/signin";
      return;
    }

    const cart = getCart();

    setItems(cart);

    // Carry over whatever the customer already picked on a provider's
    // page before clicking "Add to Cart" - falls back to the 100
    // default only when nothing in the cart set a guest count.
    const withGuestCount = cart.find((item) => item.guest_count);

    if (withGuestCount?.guest_count) {
      setGuestCount(withGuestCount.guest_count);
    }

    setLoaded(true);
  }, []);

  const handleRemove = (serviceId: string) => {
    removeFromCart(serviceId);
    setItems(getCart());
  };

  // "Plan Together" - starts a group session so up to 3 friends can be
  // invited to pick services together (see /collab/[sessionId]).
  const handlePlanTogether = async () => {
    const user = getCurrentUser();

    if (!user?.id) {
      window.location.href = "/signin";
      return;
    }

    try {
      setStartingSession(true);
      const session = await createCollabSession(user.id, user.fullName);
      const host = session.participants.find((p) => p.role === "HOST");

      if (host) {
        setActiveCollabSession({
          sessionId: session.id,
          participantId: host.id,
          displayName: host.display_name,
        });
      }

      router.push(`/collab/${session.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't start a group session. Please try again.");
    } finally {
      setStartingSession(false);
    }
  };

  const handleMoveToWishlist = async (item: CartItem) => {
    const user = getCurrentUser();

    if (!user?.id) {
      window.location.href = "/signin";
      return;
    }

    setWishlistBusyId(item.service_id);

    try {
      await addToWishlist(user.id, item.provider_id);
      removeFromCart(item.service_id);
      setItems(getCart());
    } catch (err) {
      console.error(err);
      toast.error("Couldn't move this to your wishlist. Please try again.");
    } finally {
      setWishlistBusyId(null);
    }
  };

  const handleBookingSuccess = (successfulServiceIds: string[]) => {
    successfulServiceIds.forEach((id) => removeFromCart(id));
    setItems(getCart());
  };

  // Event Date/Check-out/Rooms/People are edited right here on the
  // cart page now (instead of being asked for again on the booking
  // review page), so an edit needs to persist back into the stored
  // cart item, not just local component state.
  const handleDetailChange = (
    serviceId: string,
    patch: Partial<CartItem>
  ) => {
    updateCartItem(serviceId, patch);
    setItems(getCart());
  };

  // Every item needs its own Event Date before it can be booked -
  // whether booking one item or the whole cart together - since the
  // review page after this is just a read-only bill with no way to
  // fill in a missing date.
  const startBooking = (itemsToBook: CartItem[]) => {
    const missingDate = itemsToBook.find((item) => !item.event_date);

    if (missingDate) {
      toast.error(
        `Please set an Event Date for ${missingDate.provider_name} — ${missingDate.service_name} before continuing.`
      );
      return;
    }

    const missingTime = itemsToBook.find((item) => !item.event_time);

    if (missingTime) {
      toast.error(
        `Please set an Event Time for ${missingTime.provider_name} — ${missingTime.service_name} before continuing.`
      );
      return;
    }

    setReviewingServices(
      Object.fromEntries(
        itemsToBook.map((item) => [item.service_id, item])
      )
    );
  };

  const estimatedCostFor = (item: CartItem) =>
    calculateEstimatedCost(
      item.price,
      item.pricing_type,
      guestCount,
      item.min_quantity,
      item.max_quantity,
      calculateNumDays(item.event_date, item.event_end_date),
      item.quantity
    );

  // Amazon-style running total - always derived straight from
  // whatever's currently in the cart, so removing/wishlisting/booking
  // an item updates it immediately with no extra bookkeeping.
  const total = items.reduce(
    (sum, item) => sum + estimatedCostFor(item),
    0
  );

  if (!loaded) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        Loading cart...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-[#1F2937]">
            Your Cart
          </h1>

          <button
            type="button"
            onClick={handlePlanTogether}
            disabled={startingSession}
            className="flex items-center gap-2 rounded-lg border border-[#1E3A8A] px-4 py-2 text-sm font-semibold text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white transition disabled:opacity-60"
          >
            <Users size={16} />
            {startingSession ? "Starting..." : "Plan with Friends"}
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-dashed bg-white p-12 text-center text-gray-500">
          <h3 className="text-lg font-semibold text-[#1F2937]">
            Your cart is empty
          </h3>

          <p className="mt-2">
            Add services from any provider&apos;s page to book them
            together.
          </p>

          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#1E3A8A] px-6 py-2.5 font-medium text-white hover:bg-[#182E6E]"
          >
            Browse Providers
          </Link>
        </div>
      </div>
    );
  }

  if (reviewingServices) {
    const reviewedItems = Object.values(reviewingServices);

    // Carry over whatever was already picked on a provider's page
    // before "Add to Cart" was clicked, instead of asking again from
    // scratch.
    const withEventDate = reviewedItems.find((item) => item.event_date);
    const withEndDate = reviewedItems.find(
      (item) => item.event_end_date
    );
    const withNotes = reviewedItems.find((item) => item.notes);

    return (
      <div className="max-w-2xl mx-auto p-8">
        <BookingReview
          selectedServices={reviewingServices}
          guestCount={guestCount}
          initialEventDate={withEventDate?.event_date}
          initialEndDate={withEndDate?.event_end_date}
          initialNotes={withNotes?.notes}
          onBack={() => setReviewingServices(null)}
          onBookingSuccess={handleBookingSuccess}
          editableDetails={false}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937]">
            Your Cart
          </h1>

          <p className="mt-2 text-gray-600">
            {items.length} service{items.length === 1 ? "" : "s"} in your
            cart. Book them individually or all together.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePlanTogether}
          disabled={startingSession}
          className="flex items-center gap-2 rounded-lg border border-[#1E3A8A] px-4 py-2 text-sm font-semibold text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white transition disabled:opacity-60"
        >
          <Users size={16} />
          {startingSession ? "Starting..." : "Plan with Friends"}
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <div
            key={item.service_id}
            className="rounded-3xl bg-white border shadow-sm p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-[#1F2937]">
                  {item.provider_name}
                </h3>

                <p className="text-sm text-gray-500">
                  {item.service_name}
                </p>

                {item.category_name && (
                  <p className="mt-1 text-xs text-gray-400">
                    {item.category_name}
                  </p>
                )}
              </div>

              <span className="whitespace-nowrap text-lg font-bold text-[#1F2937]">
                ₹{estimatedCostFor(item).toLocaleString("en-IN")}
              </span>
            </div>

            {(() => {
              const isPerDay = item.pricing_type === "PER_DAY";
              const isAccommodation = isAccommodationService(item);
              const isGrooming = isGroomingService(item);
              const suggestedQuantity = suggestedQuantityFor(
                item.category_name,
                guestCount,
                item.occupancy_per_room,
                item.min_quantity
              );

              // Every item shows its own Event Date; whatever else
              // that service specifically needs (Check-out, Rooms,
              // People) fills the second column next to it. When none
              // of those apply, the overall event Guest Count goes
              // there instead - it's a whole-event value shared across
              // every item, but showing it once inline is more useful
              // than a lonely blank column, and it means it doesn't
              // need its own separate section at the bottom anymore.
              const showGuestCountHere =
                !isPerDay && !isAccommodation && !isGrooming;

              return (
                <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      {isPerDay ? "Check-in Date" : "Event Date"}
                    </label>

                    <input
                      type="date"
                      value={item.event_date || ""}
                      min={getEarliestBookableDate()}
                      max={getLatestBookableDate()}
                      onChange={(e) =>
                        handleDetailChange(item.service_id, {
                          event_date: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border p-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      {isPerDay ? "Check-in Time" : "Event Time"}
                    </label>

                    <input
                      type="time"
                      value={item.event_time || ""}
                      onChange={(e) =>
                        handleDetailChange(item.service_id, {
                          event_time: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border p-2 text-sm"
                    />
                  </div>

                  {showGuestCountHere && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Guest Count
                      </label>

                      <input
                        type="number"
                        min={1}
                        value={guestCount}
                        onChange={(e) =>
                          setGuestCount(
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-full rounded-lg border p-2 text-sm"
                      />

                      {/* The price above does recalculate live as this
                          changes - but for PER_PLATE/PER_PERSON items
                          with a provider-set minimum order, it floors
                          at that minimum (same clamp used on the
                          provider's own booking card), so a guest
                          count below it won't lower the price any
                          further. Call that out here so it doesn't
                          look like the edit was ignored. */}
                      {isPerUnitPricing(item.pricing_type) &&
                        item.min_quantity != null &&
                        guestCount < item.min_quantity && (
                          <p className="mt-1 text-xs text-amber-600">
                            Minimum order for this service is{" "}
                            {item.min_quantity} - price is billed at{" "}
                            {item.min_quantity}, not your entered
                            guest count.
                          </p>
                        )}
                    </div>
                  )}

                  {isPerDay && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Check-out Date
                      </label>

                      <input
                        type="date"
                        value={item.event_end_date || ""}
                        min={item.event_date || getEarliestBookableDate()}
                        max={getLatestBookableDate()}
                        onChange={(e) =>
                          handleDetailChange(item.service_id, {
                            event_end_date: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border p-2 text-sm"
                      />
                    </div>
                  )}

                  {isAccommodation && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Rooms
                      </label>

                      <input
                        type="number"
                        min={1}
                        value={item.quantity || suggestedQuantity}
                        onChange={(e) =>
                          handleDetailChange(item.service_id, {
                            quantity: Math.max(
                              1,
                              Number(e.target.value) || 1
                            ),
                          })
                        }
                        className="w-full rounded-lg border p-2 text-sm"
                      />

                      {item.total_rooms && (
                        <p className="mt-1 text-xs text-[#16A34A] font-medium">
                          {item.total_rooms} available
                        </p>
                      )}
                    </div>
                  )}

                  {isGrooming && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Number of People
                      </label>

                      <input
                        type="number"
                        min={1}
                        max={MAX_PEOPLE_QUANTITY}
                        value={item.quantity || suggestedQuantity}
                        onChange={(e) =>
                          handleDetailChange(item.service_id, {
                            quantity: Math.min(
                              MAX_PEOPLE_QUANTITY,
                              Math.max(1, Number(e.target.value) || 1)
                            ),
                          })
                        }
                        className="w-full rounded-lg border p-2 text-sm"
                      />

                      <p className="mt-1 text-xs text-gray-500">
                        How many people you want to cover (max{" "}
                        {MAX_PEOPLE_QUANTITY}).
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => startBooking([item])}
                className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#182E6E] transition"
              >
                Book Now
              </button>

              <button
                type="button"
                onClick={() => handleMoveToWishlist(item)}
                disabled={wishlistBusyId === item.service_id}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#1E3A8A] hover:text-[#1E3A8A] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Heart size={16} />
                {wishlistBusyId === item.service_id
                  ? "Moving..."
                  : "Move to Wishlist"}
              </button>

              <button
                type="button"
                onClick={() => handleRemove(item.service_id)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 transition"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl bg-white border shadow-sm p-6">
        <div className="flex items-center justify-between text-lg font-bold text-[#1F2937]">
          <span>
            Subtotal ({items.length} item
            {items.length === 1 ? "" : "s"})
          </span>
          <span>₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => startBooking(items)}
        className="mt-6 w-full rounded-xl bg-[#1E3A8A] py-4 text-lg font-semibold text-white hover:bg-[#182E6E] transition"
      >
        Continue to Booking ({items.length} service
        {items.length === 1 ? "" : "s"})
      </button>
    </div>
  );
}
