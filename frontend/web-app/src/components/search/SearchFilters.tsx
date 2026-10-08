"use client";

import type { AttributeSection } from "@/utils/serviceAttributesSchema";

export type SortOption =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "rating_desc";

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  categories: CategoryOption[];
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;

  subcategories: CategoryOption[];
  subcategoryId: string;
  onSubcategoryChange: (subcategoryId: string) => void;

  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;

  minRating: number;
  onMinRatingChange: (value: number) => void;

  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;

  // Category-specific spec filters (Amenities, Cuisine, etc.) - null
  // when no category is selected or the selected category has no
  // defined schema (see utils/serviceAttributesSchema.ts). Only
  // boolean and checkbox_group fields are rendered as filters here;
  // number/text fields (capacities, camera brands, etc.) are spec
  // info, not something a customer facets search results by.
  attributeSections: AttributeSection[] | null;
  attributeFilters: Record<string, unknown>;
  onAttributeFilterChange: (key: string, value: unknown) => void;

  onClear: () => void;

  resultCount: number;
}

const RATING_OPTIONS = [
  { label: "Any rating", value: 0 },
  { label: "3+ stars", value: 3 },
  { label: "4+ stars", value: 4 },
  { label: "4.5+ stars", value: 4.5 },
];

export default function SearchFilters({
  categories,
  categoryId,
  onCategoryChange,
  subcategories,
  subcategoryId,
  onSubcategoryChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  minRating,
  onMinRatingChange,
  sortBy,
  onSortChange,
  attributeSections,
  attributeFilters,
  onAttributeFilterChange,
  onClear,
  resultCount,
}: Props) {
  const hasActiveFilters =
    !!categoryId ||
    !!subcategoryId ||
    !!minPrice ||
    !!maxPrice ||
    minRating > 0 ||
    sortBy !== "relevance" ||
    Object.values(attributeFilters).some((v) =>
      Array.isArray(v) ? v.length > 0 : Boolean(v)
    );

  const toggleAttributeOption = (
    key: string,
    option: string
  ) => {
    const current = Array.isArray(attributeFilters[key])
      ? (attributeFilters[key] as string[])
      : [];

    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];

    onAttributeFilterChange(key, next);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#1F2937]">Filters</h3>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-[#1E3A8A] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-5">
        {resultCount} {resultCount === 1 ? "result" : "results"}
      </p>

      {/* Sort */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#1F2937] mb-2">
          Sort by
        </label>

        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
        >
          <option value="relevance">Relevance</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating_desc">Rating: High to Low</option>
        </select>
      </div>

      {/* Category - once one is set (either picked here or carried over
          from the home page search), it's shown as a fixed label rather
          than a re-pickable dropdown; "Change" clears it back to the
          full list. */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#1F2937] mb-2">
          Category
        </label>

        {categoryId ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
            <span className="font-medium text-[#1F2937]">
              {categories.find((c) => c.id === categoryId)?.name || "Selected category"}
            </span>

            <button
              type="button"
              onClick={() => onCategoryChange("")}
              className="text-xs font-medium text-[#1E3A8A] hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]"
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Subcategory - only meaningful once a category is picked. If the
          customer already chose one on the home page it's shown locked
          the same way category is; otherwise it's a live picker scoped
          to that category. */}
      {categoryId && (subcategoryId || subcategories.length > 0) && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#1F2937] mb-2">
            Subcategory
          </label>

          {subcategoryId ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
              <span className="font-medium text-[#1F2937]">
                {subcategories.find((s) => s.id === subcategoryId)?.name ||
                  "Selected subcategory"}
              </span>

              <button
                type="button"
                onClick={() => onSubcategoryChange("")}
                className="text-xs font-medium text-[#1E3A8A] hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]"
              value={subcategoryId}
              onChange={(e) => onSubcategoryChange(e.target.value)}
            >
              <option value="">All Subcategories</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Price range */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#1F2937] mb-2">
          Price range (₹)
        </label>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
          />

          <span className="text-gray-400">-</span>

          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
          />
        </div>
      </div>

      {/* Rating */}
      <div className={attributeSections?.length ? "mb-6" : ""}>
        <label className="block text-sm font-semibold text-[#1F2937] mb-2">
          Customer rating
        </label>

        <div className="flex flex-col gap-2">
          {RATING_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="radio"
                name="minRating"
                checked={minRating === opt.value}
                onChange={() => onMinRatingChange(opt.value)}
                className="accent-[#1E3A8A]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Category-specific spec filters (Amenities, Cuisine, Artist
          Type, etc.) - only shown once a category with a defined
          schema is selected. Number/text fields from that schema
          (capacities, camera brands...) are intentionally skipped -
          only boolean and checkbox_group fields make sense as
          faceted search filters. */}
      {attributeSections?.map((section) => {
        const filterableFields = section.fields.filter(
          (f) => f.type === "boolean" || f.type === "checkbox_group"
        );

        if (filterableFields.length === 0) return null;

        return (
          <div key={section.title} className="mb-6 last:mb-0">
            <label className="block text-sm font-semibold text-[#1F2937] mb-2">
              {section.title}
            </label>

            <div className="flex flex-col gap-2">
              {filterableFields.map((field) => {
                if (field.type === "boolean") {
                  return (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(attributeFilters[field.key])}
                        onChange={(e) =>
                          onAttributeFilterChange(
                            field.key,
                            e.target.checked
                          )
                        }
                        className="accent-[#1E3A8A]"
                      />
                      {field.label}
                    </label>
                  );
                }

                const selected = Array.isArray(attributeFilters[field.key])
                  ? (attributeFilters[field.key] as string[])
                  : [];

                return (
                  <div key={field.key}>
                    {(field.options ?? []).map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(option)}
                          onChange={() =>
                            toggleAttributeOption(field.key, option)
                          }
                          className="accent-[#1E3A8A]"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
