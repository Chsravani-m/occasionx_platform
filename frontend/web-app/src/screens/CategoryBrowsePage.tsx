"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getCategories, Category } from "@/services/catalogApi";
import {
  getProvidersByCategory,
  CategoryProvider,
} from "@/services/providerApi";
import { findByAliasedSlug, CATEGORY_SLUG_ALIASES } from "@/utils/slug";
import { CategoryImage } from "@/components/category/CategoryImage";
import { getImageUrl } from "@/lib/image";

interface CategoryBrowsePageProps {
  slug: string;
}

function startingPrice(provider: CategoryProvider): number | null {
  if (!provider.pricing.length) return null;

  return Math.min(...provider.pricing.map((p) => p.amount));
}

export function CategoryBrowsePage({ slug }: CategoryBrowsePageProps) {
  const [category, setCategory] = useState<Category | null | undefined>(
    undefined
  );
  const [providers, setProviders] = useState<CategoryProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const categories: Category[] = await getCategories();

        const match = findByAliasedSlug(
          categories,
          slug,
          CATEGORY_SLUG_ALIASES
        );

        setCategory(match ?? null);

        if (match) {
          const data = await getProvidersByCategory(match.id);
          setProviders(data);
        }
      } catch (err) {
        console.error(err);
        setCategory(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        Loading category...
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-dashed bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-[#1F2937]">
            Category not found
          </h3>

          <p className="mt-2 text-[#5B756D]">
            We couldn&apos;t match &quot;{slug}&quot; to a known category.
          </p>

          <Link
            href="/categories"
            className="mt-4 inline-block text-[#182E6E] underline"
          >
            Browse all categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative mb-8 h-48 overflow-hidden rounded-3xl shadow sm:h-64">
          <CategoryImage
            categoryName={category.name}
            fallbackKey={category.id}
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6">
            <h1 className="text-3xl font-bold text-white drop-shadow">
              {category.name}
            </h1>

            {category.description && (
              <p className="mt-1 max-w-2xl text-white/85">
                {category.description}
              </p>
            )}
          </div>
        </div>

        {providers.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-[#1F2937]">
              No providers yet
            </h3>

            <p className="mt-2 text-[#5B756D]">
              We don&apos;t have verified providers in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => {
              const price = startingPrice(provider);

              return (
                <Link
                  key={provider.id}
                  href={`/provider/${provider.id}`}
                  className="overflow-hidden rounded-3xl bg-white shadow transition hover:shadow-md"
                >
                  <div className="h-44 w-full overflow-hidden bg-[#EFEAE2]">
                    <img
                      src={getImageUrl(provider.cover_image)}
                      alt={provider.business_name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Seed/test providers with no uploaded photos hit
                        // getImageUrl's "/provider-placeholder.jpg" fallback,
                        // which doesn't exist as a file - fall through to a
                        // deterministic placeholder instead of a broken icon.
                        const img = e.currentTarget;
                        const fallback = `https://picsum.photos/seed/${provider.id}/400/300`;
                        if (img.src !== fallback) img.src = fallback;
                      }}
                    />
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-[#1F2937]">
                      {provider.business_name}
                    </h3>

                    <p className="mt-2 text-sm text-[#5B756D]">
                      {price !== null
                        ? `Starting at ₹${price.toLocaleString("en-IN")}`
                        : "Contact for pricing"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
