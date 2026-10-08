"use client";

import React from "react";
import { useRouter } from "next/navigation";

// Mock data model
interface OfferCard {
  id: number;
  title: string;
  category: string;
  location: string;
  discountLabel: string;
  description: string;
  rating: number;
  reviewCount: number;
  startingPrice?: string;
}

const OFFERS: OfferCard[] = [
  {
    id: 1,
    title: "Flat 20% off on Premium Photographers",
    category: "Photography",
    location: "Hyderabad",
    discountLabel: "20% OFF",
    description: "Capture your event with top-rated photographers at a special price.",
    rating: 4.7,
    reviewCount: 120,
    startingPrice: "From ₹25,000",
  },
  {
    id: 2,
    title: "Combo Deal: Venue + Catering",
    category: "Venues & Catering",
    location: "Secunderabad",
    discountLabel: "Combo Deal",
    description: "Book venue and catering together and save more on your celebration.",
    rating: 4.8,
    reviewCount: 95,
    startingPrice: "From ₹60,000",
  },
  {
    id: 3,
    title: "Limited Time: 15% Off on Décor Packages",
    category: "Décor",
    location: "Ranga Reddy",
    discountLabel: "Limited Time",
    description: "Transform your venue with stunning décor at a discounted rate.",
    rating: 4.6,
    reviewCount: 80,
    startingPrice: "From ₹18,000",
  },
  {
    id: 4,
    title: "Catering Special: Free Dessert Add-on",
    category: "Catering",
    location: "Hyderabad",
    discountLabel: "Special Offer",
    description: "Get a free dessert add-on with every catering booking this month.",
    rating: 4.9,
    reviewCount: 110,
    startingPrice: "From ₹500/plate",
  },
  {
    id: 5,
    title: "Photography + Videography Combo",
    category: "Photography",
    location: "Medchal",
    discountLabel: "Combo Deal",
    description: "Book both photography and videography for a bundled discount.",
    rating: 4.8,
    reviewCount: 70,
    startingPrice: "From ₹40,000",
  },
  {
    id: 6,
    title: "Venue Flash Sale: 25% Off",
    category: "Venues",
    location: "Gachibowli",
    discountLabel: "25% OFF",
    description: "Limited-time flash sale on select premium venues.",
    rating: 4.7,
    reviewCount: 60,
    startingPrice: "From ₹35,000",
  },
];

export const OffersSection: React.FC = () => {
  const router = useRouter();

  return (
    <section id="deals" className="bg-white border-t border-[#E5E7EB] py-16 scroll-mt-28">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Section Heading */}
        <div className="text-center">
            <h2 className="text-3xl font-bold text-[#1F2937] mb-2">
                Special Offers & Limited-Time Deals
                </h2>

                <p className="text-[#1E3A8A]">
                Save more on top-rated venues, catering, photography and décor.
                </p>
        </div>
        {/* Offers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {OFFERS.map((offer) => (
            <div
              key={offer.id}
              className="
                bg-white
                border
                border-[#E5E7EB]
                rounded-2xl
                p-5
                shadow-sm
                hover:shadow-lg
                hover:-translate-y-1
                transition-all
                duration-300
                flex
                flex-col
                justify-between
                ">
              {/* Top Row: Discount + Category/Location */}
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex text-xs font-semibold px-2 py-1 rounded-full bg-[#C89B3C] text-white">
                  {offer.discountLabel}
                </span>
                <span className="text-xs text-[#1F2937] font-medium group-hover:text-gray-900">
                  {offer.category} &bull; {offer.location}
                </span>
              </div>
              {/* Title */}
              <div className="font-bold text-base md:text-lg text-[#1F2937] mb-1 group-hover:text-gray-900">
                {offer.title}
              </div>
              {/* Description */}
              <div className="text-xs text-[#1F2937] mb-2 group-hover:text-gray-900">
                {offer.description}
              </div>
              {/* Rating Row */}
              <div className="flex items-center gap-2 text-xs text-[#C89B3C] font-semibold mb-1 group-hover:text-gray-900">
                <span>⭐ {offer.rating} ({offer.reviewCount} reviews)</span>
              </div>
              {/* Price Row */}
              {offer.startingPrice && (
                <div className="text-xs text-[#1F2937] font-semibold mb-2 group-hover:text-gray-900">
                  {offer.startingPrice}
                </div>
              )}
              {/* Button Row */}
              <button

                className="
                    mt-4
                    w-full
                    bg-[#1E3A8A]
                    text-white
                    py-3
                    rounded-xl
                    font-semibold
                    hover:bg-[#182E6E]
                    transition
                "


                // There's no per-offer detail page (these are
                // illustrative/mock offers, not real backend records) -
                // route to the matching category's provider listing
                // instead of a dead /offers/{id} link.
                onClick={() => router.push("/categories")}
              >
                View Offer
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
