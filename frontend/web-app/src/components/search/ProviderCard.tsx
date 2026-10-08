"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Star, ShieldCheck, ArrowRight, Heart } from "lucide-react";
import { getImageUrl } from "@/lib/image";
import {
  addToWishlist,
  removeFromWishlist,
  checkWishlisted,
} from "@/services/wishlistApi";
import { getCurrentUser } from "@/utils/auth";

export interface ProviderCardModel {
  id: string;

  business_name: string;

  city?: string;

  state?: string;

  address?: string;

  category_id?: string;

  category_name?: string;

  cover_image?: string;

  verification_status: string;

  starting_price?: number;

  rating?: number;

  review_count?: number;

  // Category-specific spec fields (Amenities, Cuisine, etc.) - used by
  // SearchPage's client-side attribute filters, not rendered on the
  // card itself.
  attributes?: Record<string, unknown>;
}

interface Props {
  provider: ProviderCardModel;
}

export default function ProviderCard({
  provider,
}: Props) {
  const verified =
    provider.verification_status ===
    "VERIFIED";

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();

    if (!user?.id) return;

    checkWishlisted(user.id, provider.id)
      .then(setIsWishlisted)
      .catch((err) => console.error(err));
  }, [provider.id]);

  const toggleWishlist = async (
    e: React.MouseEvent
  ) => {
    // Card body is wrapped in a <Link> below the image - stop the
    // click from also navigating to the provider details page.
    e.preventDefault();
    e.stopPropagation();

    const user = getCurrentUser();

    if (!user?.id) {
      window.location.href = "/signin";
      return;
    }

    setWishlistBusy(true);

    try {
      if (isWishlisted) {
        await removeFromWishlist(user.id, provider.id);
        setIsWishlisted(false);
      } else {
        await addToWishlist(user.id, provider.id);
        setIsWishlisted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWishlistBusy(false);
    }
  };

  return (
    <div
      className="
        group
        bg-white
        rounded-3xl
        overflow-hidden
        border
        border-gray-200
        hover:border-[#5B756D]
        hover:shadow-2xl
        transition-all
        duration-300
        hover:-translate-y-1
      "
    >
      {/* Cover Image */}

      <div className="relative h-64 overflow-hidden">

        <img
          src={getImageUrl(
            provider.cover_image
          )}
          alt={provider.business_name}
          className="
            w-full
            h-full
            object-cover
            transition-transform
            duration-500
            group-hover:scale-105
          "
        />

        {verified && (
          <div
            className="
              absolute
              top-4
              left-4
              bg-green-600
              text-white
              rounded-full
              px-3
              py-1
              flex
              items-center
              gap-1
              text-xs
              font-semibold
              shadow-lg
            "
          >
            <ShieldCheck size={15} />
            Verified
          </div>
        )}

        <button
          onClick={toggleWishlist}
          disabled={wishlistBusy}
          aria-label={
            isWishlisted
              ? "Remove from wishlist"
              : "Save to wishlist"
          }
          className="
            absolute
            top-4
            right-4
            w-10
            h-10
            rounded-full
            bg-white/90
            shadow-md
            hover:bg-red-50
            transition
            flex
            items-center
            justify-center
            disabled:opacity-60
          "
        >
          <Heart
            size={18}
            className={
              isWishlisted
                ? "fill-red-500 text-red-500"
                : "text-gray-500"
            }
          />
        </button>

      </div>

      {/* Body */}

      <div className="p-6">

        <div className="flex items-start justify-between">

          <div>

            <h2 className="text-xl font-bold text-[#1F2937]">

              {provider.business_name}

            </h2>

            <p className="text-[#5B756D] mt-1">

              {provider.category_name ??
                "Professional Service"}

            </p>

          </div>

        </div>

        {/* Location */}

        <div className="flex items-center gap-2 mt-4 text-gray-500">

          <MapPin size={18} />

          <span>

            {provider.address ||
              provider.city ||
              provider.state ||
              "Location available after booking"}

          </span>

        </div>

        {/* Rating */}

        <div className="flex items-center justify-between mt-5">

          <div className="flex items-center gap-2">

            <Star
              size={18}
              className="fill-yellow-400 text-yellow-400"
            />

            <span className="font-semibold">

              {provider.rating ?? "New"}

            </span>

            <span className="text-gray-500 text-sm">

              ({provider.review_count ?? 0})

            </span>

          </div>

          <div className="text-right">

            <div className="font-bold text-xl text-[#1F2937]">

              ₹
              {provider.starting_price
                ? provider.starting_price.toLocaleString()
                : "--"}

            </div>

            <div className="text-xs text-gray-500">

              onwards

            </div>

          </div>

        </div>

        {/* Button */}
          
        <Link
          href={`/provider/${provider.id}`}
        >
          <button
            className="
              mt-6
              w-full
              rounded-xl
              bg-[#1E3A8A]
              hover:bg-[#182E6E]
              text-white
              py-3
              font-semibold
              flex
              items-center
              justify-center
              gap-2
              transition
            "
          >
            View Details

            <ArrowRight size={18} />
          </button>
        </Link>

      </div>

    </div>
  );
}