import React, { useEffect, useMemo, useState } from "react";

export interface FiltersBarProps {
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "BEST_MATCH" | "PRICE_ASC" | "PRICE_DESC" | "RATING_DESC";
  onChange: (filters: {
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: "BEST_MATCH" | "PRICE_ASC" | "PRICE_DESC" | "RATING_DESC";
  }) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  minPrice,
  maxPrice,
  minRating,
  sortBy = "BEST_MATCH",
  onChange,
}) => {
  const [localMinPrice, setLocalMinPrice] = useState<number | "">(minPrice ?? "");
  const [localMaxPrice, setLocalMaxPrice] = useState<number | "">(maxPrice ?? "");
  const [localMinRating, setLocalMinRating] = useState<number | "">(minRating ?? "");
  const [localSortBy, setLocalSortBy] = useState<
    "BEST_MATCH" | "PRICE_ASC" | "PRICE_DESC" | "RATING_DESC"
  >(sortBy);

  useEffect(() => {
    setLocalMinPrice(minPrice ?? "");
  }, [minPrice]);

  useEffect(() => {
    setLocalMaxPrice(maxPrice ?? "");
  }, [maxPrice]);

  useEffect(() => {
    setLocalMinRating(minRating ?? "");
  }, [minRating]);

  useEffect(() => {
    setLocalSortBy(sortBy);
  }, [sortBy]);

  const emitChange = () => {
    onChange({
      minPrice: localMinPrice === "" ? undefined : Number(localMinPrice),
      maxPrice: localMaxPrice === "" ? undefined : Number(localMaxPrice),
      minRating: localMinRating === "" ? undefined : Number(localMinRating),
      sortBy: localSortBy,
    });
  };

  const containerClasses = useMemo(
    () =>
      "ox-filters-bar w-full rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl",
    []
  );

  const inputClasses =
    "w-full rounded-md border border-white/20 bg-black/20 p-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none";

  const labelClasses = "mb-2 block text-xs uppercase tracking-wide text-white/70";

  return (
    <div className={containerClasses}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Price Range */}
        <div>
          <label className={labelClasses}>Price Range</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={localMinPrice}
              onChange={(e) => {
                const v = e.target.value;
                setLocalMinPrice(v === "" ? "" : Number(v));
              }}
              onBlur={emitChange}
              className={inputClasses}
              placeholder="Min ₹"
            />
            <span className="text-white/60">—</span>
            <input
              type="number"
              min={0}
              value={localMaxPrice}
              onChange={(e) => {
                const v = e.target.value;
                setLocalMaxPrice(v === "" ? "" : Number(v));
              }}
              onBlur={emitChange}
              className={inputClasses}
              placeholder="Max ₹"
            />
          </div>
        </div>

        {/* Minimum Rating */}
        <div>
          <label className={labelClasses}>Minimum Rating</label>
          <select
            value={localMinRating === "" ? "" : String(localMinRating)}
            onChange={(e) => {
              const label = e.target.value;
              if (!label) {
                setLocalMinRating("");
              } else {
                const numeric = Number(label.replace("+", ""));
                setLocalMinRating(Number.isNaN(numeric) ? "" : numeric);
              }
              emitChange();
            }}
            className={inputClasses}
          >
            <option value="" className="bg-gray-900">
              Any
            </option>
            <option value="3" className="bg-gray-900">
              3.0+
            </option>
            <option value="3.5" className="bg-gray-900">
              3.5+
            </option>
            <option value="4" className="bg-gray-900">
              4.0+
            </option>
            <option value="4.5" className="bg-gray-900">
              4.5+
            </option>
            <option value="4.8" className="bg-gray-900">
              4.8+
            </option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className={labelClasses}>Sort By</label>
          <select
            value={localSortBy}
            onChange={(e) => {
              const v = e.target.value as
                | "BEST_MATCH"
                | "PRICE_ASC"
                | "PRICE_DESC"
                | "RATING_DESC";
              setLocalSortBy(v);
              emitChange();
            }}
            className={inputClasses}
          >
            <option value="BEST_MATCH" className="bg-gray-900">
              Best Match
            </option>
            <option value="PRICE_ASC" className="bg-gray-900">
              Price: Low to High
            </option>
            <option value="PRICE_DESC" className="bg-gray-900">
              Price: High to Low
            </option>
            <option value="RATING_DESC" className="bg-gray-900">
              Rating: High to Low
            </option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
