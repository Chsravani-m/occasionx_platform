"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getCustomerWishlist,
  removeFromWishlist,
  type WishlistItem,
} from "@/services/wishlistApi";
import {
  getProvider,
  type ProviderBasicInfo,
} from "@/services/providerApi";
import { getProviderDetails } from "@/services/providerDetailsApi";
import type { ProviderService, PricingPackage } from "@/types/provider";
import { getCurrentUser } from "@/utils/auth";
import { addToCart } from "@/utils/cart";
import { useToast } from "@/context/NotificationContext";

export function WishlistPage() {
  const toast = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [providers, setProviders] = useState<
    Record<string, ProviderBasicInfo>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = async () => {
    const user = getCurrentUser();

    if (!user?.id) {
      setError("Please log in to view your wishlist.");
      setLoading(false);
      return;
    }

    try {
      const data = await getCustomerWishlist(user.id);
      setItems(data);

      const results = await Promise.allSettled(
        data.map((item) => getProvider(item.provider_id))
      );

      const map: Record<string, ProviderBasicInfo> = {};

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          map[data[index].provider_id] = result.value;
        }
      });

      setProviders(map);
    } catch (err) {
      console.error(err);
      setError("Unable to load your wishlist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = async (providerId: string) => {
    const user = getCurrentUser();

    if (!user?.id) return;

    setRemovingId(providerId);

    try {
      await removeFromWishlist(user.id, providerId);

      setItems((prev) =>
        prev.filter((item) => item.provider_id !== providerId)
      );
    } catch (err) {
      console.error(err);
      toast.error("Could not remove from wishlist.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleMoveToCart = async (providerId: string) => {
    const user = getCurrentUser();

    if (!user?.id) return;

    setMovingId(providerId);

    try {
      const details = await getProviderDetails(providerId);

      // A wishlist entry is just "interested in this provider" - it
      // doesn't carry a specific service/package the way a cart item
      // needs to. So default to that provider's cheapest available
      // pricing across all their services, same as what shows as the
      // provider's "starting price" elsewhere in the app. The customer
      // can still adjust service/package/quantity from the cart or
      // provider page afterward.
      let cheapest:
        | { service: ProviderService; pricing: PricingPackage }
        | null = null;

      for (const service of details.services) {
        for (const pricing of service.pricing) {
          if (!cheapest || pricing.amount < cheapest.pricing.amount) {
            cheapest = { service, pricing };
          }
        }
      }

      if (!cheapest) {
        toast.error(
          `${details.provider.business_name} doesn't have any ` +
          "bookable services set up yet - view their page to check " +
          "back later."
        );
        return;
      }

      addToCart({
        provider_id: details.provider.id,
        provider_name: details.provider.business_name,
        service_id: cheapest.service.id,
        service_name: cheapest.service.name,
        category_id: cheapest.service.category_id,
        pricing_id: cheapest.pricing.id,
        price: cheapest.pricing.amount,
        pricing_type: cheapest.pricing.pricing_type,
        unit: cheapest.pricing.unit,
        min_quantity: cheapest.pricing.min_quantity,
        max_quantity: cheapest.pricing.max_quantity,
        occupancy_per_room: cheapest.pricing.occupancy_per_room,
        rating: details.provider.rating ?? 0,
      });

      await removeFromWishlist(user.id, providerId);

      setItems((prev) =>
        prev.filter((item) => item.provider_id !== providerId)
      );

      toast.success("Moved to cart.");
    } catch (err) {
      console.error(err);
      toast.error("Could not move this to your cart.");
    } finally {
      setMovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        Loading your wishlist...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-[#1F2937]">
          My Wishlist
        </h1>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {!error && items.length === 0 && (
          <div className="rounded-3xl border border-dashed bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-[#1F2937]">
              Your wishlist is empty
            </h3>

            <p className="mt-2 text-[#5B756D]">
              Tap the heart icon on any provider to save them here.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {items.map((item) => {
            const provider = providers[item.provider_id];

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-3xl bg-white p-6 shadow"
              >
                <div>
                  <h3 className="text-lg font-bold text-[#1F2937]">
                    {provider?.business_name || "Provider"}
                  </h3>

                  {provider?.owner_name && (
                    <p className="text-sm text-[#5B756D]">
                      by {provider.owner_name}
                    </p>
                  )}

                  {provider?.verification_status === "VERIFIED" && (
                    <span className="mt-1 inline-block rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700">
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <Link
                    href={`/provider/${item.provider_id}`}
                    className="font-medium text-[#5B756D] hover:underline"
                  >
                    View →
                  </Link>

                  <button
                    type="button"
                    disabled={movingId === item.provider_id}
                    onClick={() => handleMoveToCart(item.provider_id)}
                    className="text-sm font-medium text-[#1E3A8A] hover:underline disabled:opacity-50"
                  >
                    {movingId === item.provider_id
                      ? "Moving..."
                      : "Move to Cart"}
                  </button>

                  <button
                    type="button"
                    disabled={removingId === item.provider_id}
                    onClick={() => handleRemove(item.provider_id)}
                    className="text-sm text-gray-500 hover:text-red-500 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
