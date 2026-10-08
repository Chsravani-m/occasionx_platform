"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getCategories, Category } from "@/services/catalogApi";
import { generateSlug } from "@/utils/slug";
import { CategoryImage } from "@/components/category/CategoryImage";
import { assignCategoryImages } from "@/utils/categoryImages";

export default function CategoriesIndexPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Resolve every card's image together so no two categories in this
  // grid ever end up showing the same photo (see
  // src/utils/categoryImages.ts).
  const images = assignCategoryImages(categories);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        Loading categories...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold text-[#1F2937]">
          Browse by Category
        </h1>

        <p className="mb-8 text-[#5B756D]">
          Find the right vendors for every part of your event.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${generateSlug(category.name)}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-3xl bg-white shadow transition hover:-translate-y-1 hover:shadow-xl"
            >
              <CategoryImage
                categoryName={category.name}
                srcs={images[category.id]}
                fallbackKey={category.id}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="text-lg font-bold text-white drop-shadow">
                  {category.name}
                </h3>

                {category.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-white/85">
                    {category.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
