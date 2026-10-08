"use client";

import { useEffect, useState } from "react";

import {
  MapPin,
  Star,
  ShieldCheck,
  Heart,
  Share2,
  Phone,
} from "lucide-react";

import { Provider } from "@/types/provider";
import { getImageUrl } from "@/lib/image";
import {
  addToWishlist,
  removeFromWishlist,
  checkWishlisted,
} from "@/services/wishlistApi";
import { getLocationLabel } from "@/services/locationApi";
import { getCurrentUser } from "@/utils/auth";

interface Props {
  provider: Provider;
  coverImage?: string
}

export default function ProviderHero({
  provider,
  coverImage,
}: Props) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  // The registration wizard's Business Address field (Tab 3) is
  // optional - only State/District/City are required - so a provider
  // can easily end up with no `address` string even though we do know
  // their city/district. Resolve those ids to names here so the
  // location line below can show something real instead of the
  // "Location available after booking" placeholder that used to show
  // any time address was empty, regardless of whether we actually had
  // location data for them.
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();

    if (!user?.id) return;

    checkWishlisted(user.id, provider.id)
      .then(setIsWishlisted)
      .catch((err) => console.error(err));
  }, [provider.id]);

  useEffect(() => {
    if (provider.address) return;
    if (!provider.district_id && !provider.state_id) return;

    getLocationLabel({
      stateId: provider.state_id,
      districtId: provider.district_id,
      locationId: provider.location_id,
    })
      .then((label) => {
        const parts = [label.location_name, label.district_name, label.state_name].filter(
          Boolean
        );
        setLocationLabel(parts.length ? parts.join(", ") : null);
      })
      .catch(() => setLocationLabel(null));
  }, [provider.address, provider.state_id, provider.district_id, provider.location_id]);

  const toggleWishlist = async () => {
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
    <section
      className="
        bg-white
        rounded-3xl
        border
        border-gray-200
        shadow-sm
        overflow-hidden
      "
    >
      <div
  className="
    relative
    h-[420px]
    overflow-hidden
  "
>

  <img
  src={getImageUrl(coverImage)}
  alt={provider.business_name}
  className="
    w-full
    h-full
    object-cover
  "
/>

  <div
    className="
      absolute
      inset-0
      bg-gradient-to-t
      from-black/70
      via-black/20
      to-transparent
    "
  />

  <div
    className="
      absolute
      bottom-8
      left-8
      text-white
    "
  >

    <h1 className="text-5xl font-bold">

      {provider.business_name}

    </h1>

    <p className="text-xl mt-2">

      by {provider.owner_name}

    </p>

  </div>

</div>
      <div className="p-8 lg:p-10">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

          {/* Left */}

          <div>

            <div className="flex items-center gap-3 flex-wrap">

              <h1 className="text-4xl font-bold text-[#1F2937]">
                {provider.business_name}
              </h1>

              {provider.verification_status ===
                "VERIFIED" && (
                <div
                  className="
                    bg-green-100
                    text-green-700
                    px-3
                    py-1
                    rounded-full
                    text-sm
                    font-medium
                    flex
                    items-center
                    gap-1
                  "
                >
                  <ShieldCheck size={16} />
                  Verified
                </div>
              )}
            </div>

            <p className="text-lg text-gray-500 mt-2">
              by {provider.owner_name}
            </p>

            {/* Rating */}

            <div className="flex items-center gap-5 mt-5">

              <div className="flex items-center gap-2">

                <Star
                  size={20}
                  className="fill-yellow-400 text-yellow-400"
                />

                <span className="font-semibold">
                  {provider.rating ?? 0}
                </span>

                <span className="text-gray-500">
                  ({provider.review_count ?? 0} reviews)
                </span>

              </div>

            </div>

            {/* Address */}

            <div className="flex items-center gap-2 mt-5 text-gray-600">

              <MapPin size={18} />

              <span>
                {provider.address ||
                  locationLabel ||
                  "Location not specified"}
              </span>

            </div>

            {/* Phone */}

            <div className="flex items-center gap-2 mt-3 text-gray-600">

              <Phone size={18} />

              <span>
                {provider.phone}
              </span>

            </div>

          </div>

          {/* Right */}

          <div className="text-right">

            <p className="text-gray-500 text-sm">
              Starting From
            </p>

            <h2 className="text-5xl font-bold text-[#1F2937] mt-2">
              ₹
              {provider.starting_price
                ? provider.starting_price.toLocaleString()
                : "--"}
            </h2>

            <p className="text-gray-500 mt-1">
              per booking
            </p>

            <div className="flex gap-3 mt-6 justify-end">

              <button
                type="button"
                onClick={toggleWishlist}
                disabled={wishlistBusy}
                aria-label={
                  isWishlisted
                    ? "Remove from wishlist"
                    : "Save to wishlist"
                }
                className={`
                  w-12
                  h-12
                  rounded-xl
                  border
                  hover:bg-gray-50
                  disabled:opacity-60
                  ${
                    isWishlisted
                      ? "border-red-200 bg-red-50"
                      : "border-gray-200"
                  }
                `}
              >
                <Heart
                  size={20}
                  className={
                    isWishlisted
                      ? "fill-red-500 text-red-500"
                      : ""
                  }
                />
              </button>

              <button
                className="
                  w-12
                  h-12
                  rounded-xl
                  border
                  border-gray-200
                  hover:bg-gray-50
                "
              >
                <Share2 size={20} />
              </button>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}