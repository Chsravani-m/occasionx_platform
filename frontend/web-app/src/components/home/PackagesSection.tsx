"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getPackages, getPackageCategoryDetails, Package } from "@/services/packageApi";
import { getEventTypes } from "@/services/catalogApi";
import { generateSlug } from "@/utils/slug";

interface DisplayPackage {
  id: string;
  eventTypeName: string;
  name: string;
  description: string | null;
  min_budget: number;
  max_budget: number;
  itemsIncluded: string[];
  hasPackage: boolean;
}

// Homepage only has room for a handful of cards - feature these first
// (falls back to filling any remaining slots from the rest of the
// in-built list if one of these isn't flagged as in-built yet).
const FEATURED_EVENT_TYPE_NAMES = [
  "Wedding",
  "Birthday Party",
  "Corporate Event",
  "House Warming",
];

const FEATURED_COUNT = 4;

export const PackagesSection: React.FC = () => {
  const router = useRouter();
  const [packages, setPackages] = useState<DisplayPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [allPackages, eventTypes] = await Promise.all([
          getPackages(),
          getEventTypes(),
        ]);

        const allInbuiltEventTypes = eventTypes.filter(
          (et) => et.is_inbuilt
        );

        const featured = FEATURED_EVENT_TYPE_NAMES.map((name) =>
          allInbuiltEventTypes.find((et) => et.name === name)
        ).filter((et): et is (typeof allInbuiltEventTypes)[number] => !!et);

        allInbuiltEventTypes.forEach((et) => {
          if (featured.length >= FEATURED_COUNT) return;
          if (!featured.some((f) => f.id === et.id)) featured.push(et);
        });

        const inbuiltEventTypes = featured.slice(0, FEATURED_COUNT);

        // One card per in-built event type - the lowest-priced active
        // package (if the admin has created one yet) stands in as that
        // event type's representative package, so Wedding (which may
        // have Classic/Gold/Platinum variants) only shows once instead
        // of once per admin-created package.
        const bestPerEventType = new Map<string, Package>();

        allPackages
          .filter((p) => p.active)
          .forEach((pkg) => {
            const existing = bestPerEventType.get(pkg.event_type_id);

            if (!existing || pkg.min_budget < existing.min_budget) {
              bestPerEventType.set(pkg.event_type_id, pkg);
            }
          });

        const withItems = await Promise.all(
          inbuiltEventTypes.map(async (eventType) => {
            const pkg = bestPerEventType.get(eventType.id);

            if (!pkg) {
              return {
                id: eventType.id,
                eventTypeName: eventType.name,
                name: `${eventType.name} Package`,
                description: null,
                min_budget: 0,
                max_budget: 0,
                itemsIncluded: [],
                hasPackage: false,
              } satisfies DisplayPackage;
            }

            let itemsIncluded: string[] = [];

            try {
              const categories = await getPackageCategoryDetails(pkg.id);
              itemsIncluded = categories.map((c) => c.category_name);
            } catch (err) {
              console.error(err);
            }

            return {
              id: pkg.id,
              eventTypeName: eventType.name,
              name: pkg.name,
              description: pkg.description,
              min_budget: pkg.min_budget,
              max_budget: pkg.max_budget,
              itemsIncluded,
              hasPackage: true,
            } satisfies DisplayPackage;
          })
        );

        setPackages(withItems);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <section className="bg-[#F8F6F2] py-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-[#1E3A8A]">
          Loading packages...
        </div>
      </section>
    );
  }

  if (packages.length === 0) {
    return null;
  }

  return (
  <section className="bg-[#F8F6F2] border-t border-[#E5E7EB] py-16">
    <div className="max-w-7xl mx-auto px-6">
      {/* Heading */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-[#1F2937] mb-3">
          Event Packages
        </h2>
        <p className="text-[#1E3A8A] text-lg">
          OX In-Built Packages, ready to customize for your celebration.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="
              bg-white
              border
              border-[#E5E7EB]
              rounded-2xl
              p-6
              shadow-sm
              hover:shadow-xl
              hover:-translate-y-1
              transition-all
              duration-300
              flex
              flex-col
            "
          >
            {/* Type */}
            <div className="flex justify-between items-center mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1E3A8A]/10 text-[#1E3A8A]">
                {pkg.eventTypeName}
              </span>

              <span className="text-sm font-semibold text-[#1F2937]">
                {pkg.hasPackage
                  ? `₹${pkg.min_budget.toLocaleString("en-IN")} – ₹${pkg.max_budget.toLocaleString("en-IN")}`
                  : "Custom Quote"}
              </span>
            </div>

            {/* Name */}
            <h3 className="text-xl font-bold text-[#1F2937] mb-2">
              {pkg.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-[#1E3A8A] mb-4">
              {pkg.description ||
                (pkg.hasPackage
                  ? "A curated package for your event."
                  : "Tell us your budget and guest count and we'll put this together for you.")}
            </p>

            {/* Included */}
            <div className="text-sm text-[#1E3A8A] mb-6">
              {pkg.itemsIncluded.length > 0 ? (
                <>
                  {pkg.itemsIncluded.slice(0, 4).join(", ")}
                  {pkg.itemsIncluded.length > 4 && " and more..."}
                </>
              ) : pkg.hasPackage ? (
                "Category details coming soon."
              ) : (
                "Custom vendor lineup based on your requirements."
              )}
            </div>

            {/* Button */}
            <button
              onClick={() =>
                router.push(
                  `/packages/in-built?event=${generateSlug(pkg.eventTypeName)}`
                )
              }
              className="
                mt-auto
                w-full
                bg-[#1E3A8A]
                text-white
                py-3
                rounded-xl
                font-semibold
                hover:bg-[#182E6E]
                transition
              "
            >
              Customize Package
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/packages"
          className="font-semibold text-[#1E3A8A] hover:text-[#182E6E]"
        >
          Or explore all package types →
        </Link>
      </div>
    </div>
  </section>
);
};
