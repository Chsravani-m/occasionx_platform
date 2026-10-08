
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import {
  FiHome, FiCoffee, FiCamera, FiFeather,
  FiBookOpen, FiScissors, FiMusic, FiMail, FiTruck, FiGrid,
} from 'react-icons/fi';

import { getCategories, getSubcategories, Category, Subcategory } from "@/services/catalogApi";
import { searchProviders, ProviderSearchResult } from "@/services/searchApi";

interface TopSupplier {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  startingPrice?: number;
}

const ICON_MAP: { keyword: string; icon: React.ReactNode }[] = [
  { keyword: 'venue', icon: <FiHome className="text-2xl" /> },
  { keyword: 'catering', icon: <FiCoffee className="text-2xl" /> },
  { keyword: 'photography', icon: <FiCamera className="text-2xl" /> },
  { keyword: 'decor', icon: <FiFeather className="text-2xl" /> },
  { keyword: 'purohit', icon: <FiBookOpen className="text-2xl" /> },
  { keyword: 'makeup', icon: <FiScissors className="text-2xl" /> },
  { keyword: 'entertainment', icon: <FiMusic className="text-2xl" /> },
  { keyword: 'invitation', icon: <FiMail className="text-2xl" /> },
  { keyword: 'logistics', icon: <FiTruck className="text-2xl" /> },
];

function iconForCategory(name: string): React.ReactNode {
  const lower = name.toLowerCase();
  const match = ICON_MAP.find((entry) => lower.includes(entry.keyword));
  return match ? match.icon : <FiGrid className="text-2xl" />;
}

export const PopularSearchCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Load real categories once, feature these 4 on the homepage
  // (falls back to filling remaining slots from the rest of the list if any are missing)
  useEffect(() => {
    getCategories()
      .then((data: Category[]) => {
        const featuredKeywords = ["accommodation", "catering", "photography", "decor"];

        const featured: Category[] = [];

        featuredKeywords.forEach((keyword) => {
          const match = data.find(
            (c) =>
              c.name.toLowerCase().includes(keyword) &&
              !featured.some((f) => f.id === c.id)
          );

          if (match) featured.push(match);
        });

        data.forEach((c) => {
          if (featured.length >= 4) return;
          if (!featured.some((f) => f.id === c.id)) featured.push(c);
        });

        const topFour = featured.slice(0, 4);

        setCategories(topFour);

        if (topFour.length > 0) {
          setSelectedCategoryId(topFour[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Load real subcategories + top providers whenever selection changes
  useEffect(() => {
    if (!selectedCategoryId) return;

    let cancelled = false;

    async function loadDetails() {
      try {
        setLoading(true);

        const [subData, providerData] = await Promise.all([
          getSubcategories(selectedCategoryId),
          searchProviders({ categoryId: selectedCategoryId }),
        ]);

        if (cancelled) return;

        setSubcategories(subData);

        const suppliers: TopSupplier[] = providerData
          .map((p: ProviderSearchResult) => ({
            id: p.id,
            name: p.business_name,
            rating: p.rating ?? 0,
            reviewCount: p.review_count ?? 0,
            startingPrice: p.starting_price ?? undefined,
          }))
          .sort((a: TopSupplier, b: TopSupplier) => b.rating - a.rating)
          .slice(0, 5);

        setTopSuppliers(suppliers);
      } catch (err) {
        console.error(err);
        setSubcategories([]);
        setTopSuppliers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
      <section className="bg-white border-t border-[#E5E7EB] py-16" id="popular-categories">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Section Title */}
        <div className="text-center">
            <h2 className="text-4xl font-bold text-[#1F2937]">
                Popular Search Categories
            </h2>

            <p className="text-[#1E3A8A] mt-2">
            Explore the most searched event services across OccasionX.
            </p>
        </div>
        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat) => (
            <div
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`
                cursor-pointer
                p-6
                border
                rounded-xl
                transition-all
                duration-300
                group
                ${
                selectedCategoryId === cat.id
                    ? "bg-[#1E3A8A] border-[#1E3A8A] shadow-lg"
                    : "bg-[#F8F6F2] border-[#E5E7EB] hover:bg-[#1E3A8A]"
                }
            `}
            >
            <div className="flex items-center gap-3 mb-3">
                <div
                className={`
                    text-2xl
                    ${
                    selectedCategoryId === cat.id
                        ? "text-white"
                        : "text-[#1E3A8A] group-hover:text-white"
                    }
                `}
                >
                {iconForCategory(cat.name)}
                </div>

                <h3
                className={`
                    text-lg
                    font-semibold
                    ${
                    selectedCategoryId === cat.id
                        ? "text-white"
                        : "text-[#1F2937] group-hover:text-white"
                    }
                `}
                >
                {cat.name}
                </h3>
            </div>

            <p
                className={`
                text-sm
                leading-6
                ${
                    selectedCategoryId === cat.id
                    ? "text-white"
                    : "text-gray-600 group-hover:text-white"
                }
                `}
            >
                {cat.description || "Explore top-rated providers."}
            </p>

            <div className="mt-5">
                <span
                className={`
                    text-sm
                    font-semibold
                    ${
                    selectedCategoryId === cat.id
                        ? "text-white"
                        : "text-[#1E3A8A] group-hover:text-white"
                    }
                `}
                >
                View →
                </span>
            </div>
            </div>
        ))}
        </div>
        {/* Detail Panel */}
        {selectedCategoryId && selectedCategory && (
            <div
                className="
                    bg-white
                    border
                    border-[#E5E7EB]
                    rounded-xl
                    p-8
                    mt-6
                    shadow-sm
                "
                >
            <div className="w-full mb-8">
              {/* Subcategories Horizontal List */}
              <div className="w-full mx-auto" style={{ background: 'transparent' }}>
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">Browse {selectedCategory.name}</h3>

                {subcategories.length === 0 ? (
                  <p className="text-sm text-[#1E3A8A]">
                    No subcategories listed yet.
                  </p>
                ) : (
                <ul className="flex flex-wrap gap-3">
                    {subcategories.map((sub) => (
                        <li
                        key={sub.id}
                        onClick={() =>
                          router.push(
                            `/search?categoryId=${selectedCategoryId}&subcategoryId=${sub.id}`
                          )
                        }
                        className="
                            px-4
                            py-2
                            rounded-full
                            bg-[#C89B3C]/20
                            border
                            border-[#E5E7EB]
                            text-[#1F2937]
                            font-medium
                            hover:bg-[#1E3A8A]
                            hover:text-white
                            transition
                            cursor-pointer
                        "
                        >
                        {sub.name}
                        </li>
                    ))}
                    </ul>
                )}
              </div>
            </div>
            <div className="w-full">
              {/* Top Suppliers Horizontal List */}
              <div className="w-full mx-auto">
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">Top Suppliers</h3>

                {topSuppliers.length === 0 ? (
                  <p className="text-sm text-[#1E3A8A]">
                    No verified providers in this category yet.
                  </p>
                ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pb-2 pr-8">
                  {topSuppliers.map((sup) => (
                    <li
                      key={sup.id}
                        className="
                            bg-[#1E3A8A]
                            text-[#F8F6F2]
                            border border-[#E5E7EB]
                            p-4
                            flex flex-col
                            justify-between
                            rounded-xl
                            hover:shadow-lg
                            transition
                            "
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg font-bold" style={{ color: '#dfe3ee' }}>{sup.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: '#dfe3ee' }}>
                        <span>
                          {sup.reviewCount > 0
                            ? `⭐ ${sup.rating.toFixed(1)} (${sup.reviewCount} reviews)`
                            : "New provider"}
                        </span>
                        {sup.startingPrice !== undefined && (
                          <span>· From ₹{sup.startingPrice.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                      <button
                        className="
                            mt-3
                            rounded-full
                            px-4
                            py-2
                            bg-[#C89B3C]
                            text-[#1F2937]
                            font-semibold
                            hover:bg-[#B8842E]
                            "
                        onClick={() => router.push(`/provider/${sup.id}`)}
                      >
                        View Profile
                      </button>
                    </li>
                  ))}
                </ul>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center items-center mt-4">
            <span className="text-[#1E3A8A] animate-pulse">Loading...</span>
          </div>
        )}
      </div>
    </section>
  );
};
