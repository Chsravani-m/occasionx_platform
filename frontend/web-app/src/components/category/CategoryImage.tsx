"use client";

import { useMemo, useState } from "react";

import {
  getCategoryImageChain,
  getCategoryFallbackImageUrl,
} from "@/utils/categoryImages";

interface CategoryImageProps {
  categoryName: string;
  className?: string;
  // Pre-resolved ordered list of candidate image URLs (e.g. from
  // assignCategoryImages(), which de-duplicates across a whole grid
  // at once). If omitted, this component resolves its own chain
  // independently from just the category name - fine for a single,
  // standalone image, but callers rendering a *list* of categories
  // should use assignCategoryImages() and pass the result here so no
  // two cards repeat the same photo.
  srcs?: string[];
  // Key used for the guaranteed-unique picsum.photos fallback if
  // every candidate photo 404s. Should be the category id when
  // rendering a list (ids are always unique; names could
  // theoretically collide).
  fallbackKey?: string;
}

// Steps through the candidate photo chain on load failure instead of
// jumping straight to a generic backup, so a single stale/renamed
// photo id doesn't cost a category its on-theme image when another
// candidate for the same theme would still work. Only falls all the
// way to the picsum.photos placeholder once every candidate has
// failed, so a category card never shows a broken-image icon - see
// src/utils/categoryImages.ts for how the chain is built.
export function CategoryImage({
  categoryName,
  className,
  srcs,
  fallbackKey,
}: CategoryImageProps) {
  const chain = useMemo(
    () =>
      srcs && srcs.length > 0
        ? srcs
        : getCategoryImageChain(categoryName, fallbackKey ?? categoryName),
    [srcs, categoryName, fallbackKey]
  );

  const [index, setIndex] = useState(0);
  const lastIndex = chain.length - 1;
  const src = chain[Math.min(index, lastIndex)] ?? getCategoryFallbackImageUrl(fallbackKey ?? categoryName);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={categoryName}
      loading="lazy"
      className={className}
      onError={() => {
        setIndex((i) => (i < lastIndex ? i + 1 : i));
      }}
    />
  );
}
