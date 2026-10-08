import {
  PackageCategory,
  PackageProvider,
} from "@/types/package";

import { ProviderCard } from "./ProviderCard";

interface CategorySectionProps {
  category: PackageCategory;

  selectedServices: Record<
    string,
    PackageProvider
  >;

  guestCount?: number;

  onSelectProvider: (
    categoryId: string,
    provider: PackageProvider
  ) => void;

  onQuantityChange?: (categoryId: string, quantity: number) => void;

  onRemove?: () => void;
}

export function CategorySection({
  category,
  selectedServices,
  guestCount,
  onSelectProvider,
  onQuantityChange,
  onRemove,
}: CategorySectionProps) {
  const sortedProviders = [...category.providers].sort(
    (a, b) => a.price - b.price
  );

  const selectedProvider = selectedServices[category.category_id];

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {category.category_name ??
            category.category_id}

          <span className="ml-2 text-sm font-normal text-gray-500">
            ({sortedProviders.length} provider
            {sortedProviders.length === 1 ? "" : "s"})
          </span>
        </h2>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm font-medium text-gray-400 hover:text-red-600"
          >
            Remove
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sortedProviders.length === 0 && (
          <p className="text-sm text-gray-400">
            No providers available in this category yet.
          </p>
        )}

        {sortedProviders.map(
          (provider: PackageProvider, index: number) => {
            const isSelected =
              selectedProvider?.service_id === provider.service_id;

            return (
              <ProviderCard
                key={provider.service_id}
                provider={provider}
                categoryName={category.category_name}
                guestCount={guestCount}
                quantity={
                  isSelected ? selectedProvider?.quantity : undefined
                }
                isBestPrice={
                  index === 0 && sortedProviders.length > 1
                }
                selected={isSelected}
                onSelect={() =>
                  onSelectProvider(
                    category.category_id,
                    provider
                  )
                }
                onQuantityChange={
                  onQuantityChange
                    ? (quantity) =>
                        onQuantityChange(
                          category.category_id,
                          quantity
                        )
                    : undefined
                }
              />
            );
          }
        )}
      </div>
    </div>
  );
}