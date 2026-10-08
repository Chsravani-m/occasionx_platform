import { PackageProvider } from "@/types/package";
import { calculateEstimatedCost } from "@/utils/pricing";

interface BudgetSummaryProps {
  budget: number;
  selectedServices: Record<string, PackageProvider>;
  guestCount?: number;
  onContinue?: () => void;
}

export function BudgetSummary({
  budget,
  selectedServices,
  guestCount,
  onContinue,
}: BudgetSummaryProps) {
  const services: PackageProvider[] =
  Object.values(selectedServices);;

  const total = services.reduce(
    (sum: number, item: PackageProvider) =>
      sum +
      calculateEstimatedCost(
        item.price,
        item.pricing_type,
        guestCount,
        item.min_quantity,
        item.max_quantity,
        undefined,
        item.quantity
      ),
    0
  );

  const remaining = budget - total;

  return (
    <div className="sticky top-24 rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">
        Budget Summary
      </h2>

      <div className="space-y-2">
        {services.map((service: PackageProvider) => (
          <div
            key={service.service_id}
            className="flex justify-between text-sm"
          >
            <span>
              {service.provider_name}
            </span>

            <span>
              ₹
              {calculateEstimatedCost(
                service.price,
                service.pricing_type,
                guestCount,
                service.min_quantity,
                service.max_quantity,
                undefined,
                service.quantity
              ).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>

      <hr className="my-4" />

      <div className="flex justify-between font-semibold">
        <span>Total</span>

        <span>
          ₹{total.toLocaleString("en-IN")}
        </span>
      </div>

      <div className="mt-2 flex justify-between">
        <span>Budget</span>

        <span>
          ₹{budget.toLocaleString("en-IN")}
        </span>
      </div>

      <div className="mt-2 flex justify-between">
        <span>Remaining</span>

        <span
          className={
            remaining >= 0
              ? "text-green-600"
              : "text-red-600"
          }
        >
          ₹
          {remaining.toLocaleString("en-IN")}
        </span>
      </div>

      {onContinue && (
        <button
          disabled={remaining < 0 || services.length === 0}
          onClick={onContinue}
          className="mt-4 w-full rounded-lg bg-[#1E3A8A] px-4 py-3 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Continue
        </button>
      )}
    </div>
  );
}
