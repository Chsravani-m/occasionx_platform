"use client";

import {
  CheckCircle,
  IndianRupee,
} from "lucide-react";

export interface PricingPackage {
  id: string;

  pricing_type: string;

  amount: number;

  currency: string;
}

interface PackagesSectionProps {
  packages: PricingPackage[];

  selectedPackage?: string;

  onSelectPackage: (
    pricing: PricingPackage
  ) => void;
}

export default function PackagesSection({
  packages,
  selectedPackage,
  onSelectPackage,
}: PackagesSectionProps) {

  if (!packages.length) {
    return null;
  }

  return (

    <section className="mt-12">

      <h2 className="text-3xl font-bold text-[#1F2937] mb-3">

        Packages

      </h2>

      <p className="text-gray-500 mb-8">

        Choose the package that suits your event.

      </p>

      <div className="grid lg:grid-cols-3 gap-7">

        {packages.map((pkg) => {

          const selected =
            selectedPackage === pkg.id;

          return (

            <div
              key={pkg.id}
              className={`
                rounded-3xl
                border-2
                p-8
                transition
                cursor-pointer
                ${
                  selected
                    ? "border-[#1E3A8A] shadow-xl"
                    : "border-gray-200 hover:border-[#1E3A8A]"
                }
              `}
              onClick={() =>
                onSelectPackage(pkg)
              }
            >

              <div className="flex justify-between">

                <h3 className="text-2xl font-bold">

                  {pkg.pricing_type}

                </h3>

                {selected && (

                  <CheckCircle
                    className="text-green-600"
                    size={26}
                  />

                )}

              </div>

              <div className="flex items-center mt-6">

                <IndianRupee
                  size={28}
                  className="text-[#1F2937]"
                />

                <span className="text-4xl font-bold">

                  {Number(pkg.amount).toLocaleString()}

                </span>

              </div>

              <div className="mt-8 space-y-3 text-gray-600">

                <div>

                  ✔ Professional Service

                </div>

                <div>

                  ✔ Verified Provider

                </div>

                <div>

                  ✔ Customer Support

                </div>

                <div>

                  ✔ Flexible Scheduling

                </div>

              </div>

              <button
                className={`
                  mt-10
                  w-full
                  py-3
                  rounded-xl
                  font-semibold
                  transition
                  ${
                    selected
                      ? "bg-[#1E3A8A] text-white"
                      : "bg-[#F8F6F2]"
                  }
                `}
              >

                {selected
                  ? "Selected"
                  : "Choose Package"}

              </button>

            </div>

          );

        })}

      </div>

    </section>

  );

}