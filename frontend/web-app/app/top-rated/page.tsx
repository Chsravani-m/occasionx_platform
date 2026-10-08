"use client";

import { useEffect, useState, useCallback } from "react";

import { searchProviders, ProviderSearchResult } from "@/services/searchApi";
import { api } from "@/lib/apiClient";

import SearchResultsGrid from "@/components/search/SearchResultsGrid";

interface Category {
  id: string;
  name: string;
}

export default function TopRatedPage() {
  const [providers, setProviders] = useState<ProviderSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get("/catalog/categories");

      const map: Record<string, string> = {};

      res.data.forEach((c: Category) => {
        map[c.id] = c.name;
      });

      setCategoryMap(map);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);

        const data = await searchProviders({});

        // Highest-rated first (providers with no reviews yet sink to
        // the bottom rather than being excluded outright), capped at
        // a reasonable page size.
        const sorted = [...data]
          .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
          .slice(0, 24);

        setProviders(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void loadProviders();
  }, []);

  return (
    <div className="bg-[#F8F6F2] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[#1F2937]">Top Rated</h1>

          <p className="text-gray-500 mt-2">
            The highest-rated providers on OccasionX, across every category.
          </p>
        </div>

        <SearchResultsGrid
          providers={providers}
          loading={loading}
          categoryMap={categoryMap}
        />
      </div>
    </div>
  );
}
