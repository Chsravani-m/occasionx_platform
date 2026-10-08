import { PackageProvider } from "@/types/package";
import {
  calculateEstimatedCost,
  formatPricingType,
  getEffectiveQuantity,
  isPerUnitPricing,
  isRatePricing,
  MAX_PEOPLE_QUANTITY,
  needsPerItemQuantity,
  quantityLabelFor,
  suggestedQuantityFor,
} from "@/utils/pricing";

interface ProviderCardProps {
  provider: PackageProvider;
  categoryName?: string | null;
  selected?: boolean;
  guestCount?: number;
  quantity?: number;
  isBestPrice?: boolean;
  onSelect: () => void;
  onQuantityChange?: (quantity: number) => void;
}

export function ProviderCard({
  provider,
  categoryName,
  selected,
  guestCount,
  quantity,
  isBestPrice,
  onSelect,
  onQuantityChange,
}: ProviderCardProps) {
  const pricingLabel = formatPricingType(provider.pricing_type);

  // Accommodation (rooms) and Makeup & Grooming (people) shouldn't be
  // priced off the full event guest count - not everyone needs a room
  // or a makeup session. This applies to the displayed estimate for
  // every card in the category, not just the one the customer has
  // selected - only the editable quantity input itself needs a
  // selection to make sense.
  const isPerItemCategory = needsPerItemQuantity(categoryName);

  const customizable =
    !!selected && !!onQuantityChange && isPerItemCategory;

  // Rooms (Accommodation) should scale with a large guest list, but a
  // "number of people" field (Makeup & Grooming etc.) is capped - see
  // MAX_PEOPLE_QUANTITY.
  const isPeopleQuantity =
    isPerItemCategory && quantityLabelFor(categoryName) === "People";

  const suggestedQuantity = suggestedQuantityFor(
    categoryName,
    guestCount,
    provider.occupancy_per_room,
    provider.min_quantity
  );

  const quantityBasis = isPerItemCategory
    ? quantity || suggestedQuantity
    : undefined;

  const estimatedCost = calculateEstimatedCost(
    provider.price,
    provider.pricing_type,
    guestCount,
    provider.min_quantity,
    provider.max_quantity,
    undefined,
    quantityBasis
  );

  const effectiveQuantity = getEffectiveQuantity(
    quantityBasis ?? guestCount,
    provider.min_quantity,
    provider.max_quantity
  );

  const basisForCap = quantityBasis ?? guestCount;

  const isCapped =
    provider.max_quantity != null &&
    !!basisForCap &&
    basisForCap > provider.max_quantity;

  const showEstimatedTotal =
    (isPerUnitPricing(provider.pricing_type) || isPerItemCategory) &&
    !!(quantityBasis ?? guestCount) &&
    estimatedCost !== provider.price;

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border p-4 transition-all
      ${
        selected
          ? "border-[#1E3A8A] bg-[#F2F3F8]"
          : "border-gray-200 hover:border-[#929EC4]"
      }`}
    >
      <div className="flex justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              {provider.provider_name}
            </h3>

            {isBestPrice && (
              <span className="rounded-full bg-[#E0E4EF] px-2 py-0.5 text-xs font-medium text-[#182E6E]">
                Best Price
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500">
            {provider.service_name}
          </p>
        </div>

        <div className="text-right">
          <div className="font-bold">
            ₹{provider.price.toLocaleString("en-IN")}
            {pricingLabel && (
              <span className="ml-1 text-xs font-normal text-gray-500">
                {isRatePricing(provider.pricing_type)
                  ? `/ ${pricingLabel}`
                  : `(${pricingLabel})`}
              </span>
            )}
          </div>

          {showEstimatedTotal && (
            <div className="text-sm text-[#182E6E]">
              ≈ ₹{estimatedCost.toLocaleString("en-IN")} for{" "}
              {effectiveQuantity}{" "}
              {isPerItemCategory
                ? quantityLabelFor(categoryName).toLowerCase()
                : "guests"}
              {isCapped && (
                <span className="text-gray-500">
                  {" "}
                  (max {provider.max_quantity})
                </span>
              )}
            </div>
          )}

          <div className="text-sm">
            ⭐ {provider.rating}
          </div>
        </div>
      </div>

      {customizable && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 flex items-center gap-2 border-t pt-3"
        >
          <label className="text-sm font-medium text-gray-700">
            {quantityLabelFor(categoryName)}
          </label>

          <input
            type="number"
            min={1}
            max={isPeopleQuantity ? MAX_PEOPLE_QUANTITY : undefined}
            value={quantity ?? suggestedQuantity}
            onChange={(e) => {
              const raw = Math.max(1, Number(e.target.value) || 1);

              onQuantityChange?.(
                isPeopleQuantity
                  ? Math.min(MAX_PEOPLE_QUANTITY, raw)
                  : raw
              );
            }}
            className="w-20 rounded-lg border p-1.5 text-sm"
          />

          {isPeopleQuantity && (
            <span className="text-xs text-gray-400">
              max {MAX_PEOPLE_QUANTITY}
            </span>
          )}

          {provider.total_rooms != null && (
            <span className="text-xs text-[#16A34A] font-medium">
              {provider.total_rooms} available
            </span>
          )}
        </div>
      )}
    </div>
  );
}
