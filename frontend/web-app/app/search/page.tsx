"use client";
import { Suspense } from "react";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { searchProviders } from "@/services/searchApi";
import { api } from "@/lib/apiClient";
import { getLocationLabels, LocationLabelMaps } from "@/services/locationApi";
import { getSubcategories, Subcategory } from "@/services/catalogApi";

import SearchResultsGrid from "@/components/search/SearchResultsGrid";
import type { ProviderCardModel } from "@/components/search/ProviderCard";
import SearchFilters, { SortOption } from "@/components/search/SearchFilters";
import { getServiceAttributeSchema } from "@/utils/serviceAttributesSchema";

export interface ProviderSearchResult {
  id: string;

  business_name: string;
  owner_name: string;

  state_id?: number;
  district_id?: number;
  location_id?: number;

  address?: string;

  category_id?: string;
  subcategory_id?: string;

  cover_image?: string;

  verification_status: string;

  starting_price?: number;

  rating?: number;

  review_count?: number;

  // Category-specific spec fields (Amenities, Cuisine, etc.) - only
  // populated once a category filter is active, see searchApi.ts.
  attributes?: Record<string, unknown>;
}

interface Category {
  id: string;
  name: string;
}

function SearchPageContent() {
  const searchParams = useSearchParams();

  const [providers, setProviders] =
    useState<ProviderSearchResult[]>([]);

  const [loading, setLoading] = useState(true);

  const [categoryMap, setCategoryMap] =
    useState<Record<string, string>>({});

  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  // Filters - category is applied server-side (refetches), price/rating/
  // sort have no backend support (see search_providers in
  // provider-service/app/api/search.py) so they're applied client-side
  // against whatever the server already returned.
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("categoryId") || ""
  );
  const [subcategoriesList, setSubcategoriesList] = useState<Subcategory[]>([]);
  const [subcategoryFilter, setSubcategoryFilter] = useState(
    searchParams.get("subcategoryId") || ""
  );
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  // Category-specific spec filters (Amenities, Cuisine, etc.) - keys
  // are attribute field keys from serviceAttributesSchema.ts; a
  // boolean-field entry is `true` when checked, a checkbox_group entry
  // is the array of selected option strings. Only meaningful once a
  // category is picked (the search API only returns `attributes` when
  // categoryId is passed - see search_providers() in
  // provider-service/app/api/search.py), so this resets whenever the
  // category changes.
  const [attributeFilters, setAttributeFilters] = useState<
    Record<string, unknown>
  >({});

  const attributeSchema = useMemo(() => {
    if (!categoryFilter) return null;

    const categoryName =
      categoriesList.find((c) => c.id === categoryFilter)?.name || "";

    return getServiceAttributeSchema(categoryName);
  }, [categoryFilter, categoriesList]);

  const handleAttributeFilterChange = (key: string, value: unknown) => {
    setAttributeFilters((prev) => ({ ...prev, [key]: value }));
  };

  // The registration wizard's Business Address field is optional (only
  // State/District/City are required), so a provider card with no
  // `address` still has real location data via state_id/district_id/
  // location_id - resolve all of it in one batched call rather than
  // showing every such card the "Location available after booking"
  // placeholder (see ProviderCard.tsx) or firing one lookup per card.
  const [locationLabels, setLocationLabels] =
    useState<LocationLabelMaps>({ states: {}, districts: {}, locations: {} });

  const loadCategories = useCallback(async () => {
  try {
    const res = await api.get("/catalog/categories");

    const map: Record<string, string> = {};

    res.data.forEach((c: Category) => {
      map[c.id] = c.name;
    });

    setCategoryMap(map);
    setCategoriesList(res.data);

  } catch (err) {
    console.error(err);
  }
}, []);

useEffect(() => {
  void loadCategories();
}, [loadCategories]);

  // A fresh search from the header (new keyword/location) carries its own
  // categoryId/subcategoryId - resync the filters to match so they don't
  // keep whatever was picked on a previous search.
  useEffect(() => {
    setCategoryFilter(searchParams.get("categoryId") || "");
    setSubcategoryFilter(searchParams.get("subcategoryId") || "");
  }, [searchParams]);

  // Load the subcategory options for whichever category is currently
  // selected in the filter (not necessarily the one in the URL).
  useEffect(() => {
    if (!categoryFilter) {
      setSubcategoriesList([]);
      return;
    }

    getSubcategories(categoryFilter)
      .then(setSubcategoriesList)
      .catch(() => setSubcategoriesList([]));
  }, [categoryFilter]);

  const handleCategoryChange = (id: string) => {
    setCategoryFilter(id);
    setSubcategoryFilter("");
    setAttributeFilters({});
  };

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);

        const data = await searchProviders({
          state: searchParams.get("state") || "",
          district: searchParams.get("district") || "",
          location: searchParams.get("location") || "",
          categoryId: categoryFilter,
          subcategoryId: subcategoryFilter,
          keyword: searchParams.get("keyword") || "",
        });

        setProviders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void loadProviders();
  }, [searchParams, categoryFilter, subcategoryFilter]);

  useEffect(() => {
    const withoutAddress = providers.filter((p) => !p.address);

    const stateIds = Array.from(
      new Set(withoutAddress.map((p) => p.state_id).filter((id): id is number => !!id))
    );
    const districtIds = Array.from(
      new Set(withoutAddress.map((p) => p.district_id).filter((id): id is number => !!id))
    );
    const locationIds = Array.from(
      new Set(withoutAddress.map((p) => p.location_id).filter((id): id is number => !!id))
    );

    if (!stateIds.length && !districtIds.length && !locationIds.length) {
      setLocationLabels({ states: {}, districts: {}, locations: {} });
      return;
    }

    getLocationLabels({ stateIds, districtIds, locationIds })
      .then(setLocationLabels)
      .catch(() => setLocationLabels({ states: {}, districts: {}, locations: {} }));
  }, [providers]);

  // ProviderSearchResult never actually carries `address` (that lives
  // only on the fuller Provider/ProviderDetails shape), so every card
  // here relies on the resolved city/district - merge that in before
  // handing off to ProviderCardModel, which understands city/state.
  const cardProviders: ProviderCardModel[] = useMemo(
    () =>
      providers.map((p) => {
        const city =
          (p.location_id && locationLabels.locations[String(p.location_id)]) ||
          (p.district_id && locationLabels.districts[String(p.district_id)]) ||
          undefined;
        const state =
          (p.state_id && locationLabels.states[String(p.state_id)]) || undefined;

        return {
          id: p.id,
          business_name: p.business_name,
          address: p.address,
          city,
          state,
          category_id: p.category_id,
          cover_image: p.cover_image,
          verification_status: p.verification_status,
          starting_price: p.starting_price,
          rating: p.rating,
          review_count: p.review_count,
          attributes: p.attributes,
        };
      }),
    [providers, locationLabels]
  );

  // Price range + rating are client-side only (no backend support), so
  // they filter/sort whatever the server already returned for the
  // current keyword/location/category.
  const filteredProviders: ProviderCardModel[] = useMemo(() => {
    let list = cardProviders;

    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

    if (min !== null) {
      list = list.filter(
        (p) => p.starting_price === undefined || p.starting_price >= min
      );
    }

    if (max !== null) {
      list = list.filter(
        (p) => p.starting_price === undefined || p.starting_price <= max
      );
    }

    if (minRating > 0) {
      list = list.filter((p) => (p.rating ?? 0) >= minRating);
    }

    // Category-specific spec filters - boolean entries require that
    // field to be true on the provider's attributes; checkbox_group
    // entries require at least one of the selected options to be
    // present (OR within a facet, AND across facets - standard
    // faceted-filter behavior).
    for (const [key, filterValue] of Object.entries(attributeFilters)) {
      if (filterValue === true) {
        list = list.filter((p) => Boolean(p.attributes?.[key]));
      } else if (Array.isArray(filterValue) && filterValue.length > 0) {
        list = list.filter((p) => {
          const providerValue = p.attributes?.[key];
          return (
            Array.isArray(providerValue) &&
            filterValue.some((v) => providerValue.includes(v))
          );
        });
      }
    }

    if (sortBy !== "relevance") {
      list = [...list].sort((a, b) => {
        if (sortBy === "price_asc") {
          return (a.starting_price ?? Infinity) - (b.starting_price ?? Infinity);
        }
        if (sortBy === "price_desc") {
          return (b.starting_price ?? -Infinity) - (a.starting_price ?? -Infinity);
        }
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }

    return list;
  }, [cardProviders, minPrice, maxPrice, minRating, sortBy, attributeFilters]);

  const clearFilters = () => {
    setCategoryFilter("");
    setSubcategoryFilter("");
    setMinPrice("");
    setMaxPrice("");
    setMinRating(0);
    setSortBy("relevance");
    setAttributeFilters({});
  };

  return (
    <div className="bg-[#F8F6F2] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1F2937]">
            Search Results
          </h1>

          <p className="text-gray-500 mt-2">
            {filteredProviders.length} providers found
          </p>
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="md:w-72 shrink-0">
            <SearchFilters
              categories={categoriesList}
              categoryId={categoryFilter}
              onCategoryChange={handleCategoryChange}
              subcategories={subcategoriesList}
              subcategoryId={subcategoryFilter}
              onSubcategoryChange={setSubcategoryFilter}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onMinPriceChange={setMinPrice}
              onMaxPriceChange={setMaxPrice}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              sortBy={sortBy}
              onSortChange={setSortBy}
              attributeSections={attributeSchema}
              attributeFilters={attributeFilters}
              onAttributeFilterChange={handleAttributeFilterChange}
              onClear={clearFilters}
              resultCount={filteredProviders.length}
            />
          </aside>

          <div className="flex-1">
            <SearchResultsGrid
              providers={filteredProviders}
              loading={loading}
              categoryMap={categoryMap}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// useSearchParams() needs a Suspense boundary for `next build` to
// prerender this page.
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
