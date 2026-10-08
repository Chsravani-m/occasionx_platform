"use client";

import { useEffect, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";

import { CategorySection } from "@/components/package-builder/CategorySection";
import { BudgetSummary } from "@/components/package-builder/BudgetSummary";
import { BookingReview } from "@/components/package-builder/BookingReview";

import {
  PackageCategory,
  PackageProvider,
} from "@/types/package";

import { getPackageProviders } from "@/services/packageApi";
import {
  needsPerItemQuantity,
  suggestedQuantityFor,
} from "@/utils/pricing";

interface PackageBuilderPageProps {
  packageId: string;

  stateId: number;
  districtId: number;
  locationId: number;

  budget: number;
  guestCount?: number;
  packageName?: string;
  eventDate?: string;
}

export function PackageBuilderPage({
  packageId,
  stateId,
  districtId,
  locationId,
  budget,
  guestCount,
  packageName,
  eventDate,
}: PackageBuilderPageProps) {
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [loading, setLoading] =
    useState<boolean>(true);

  const [categories, setCategories] =
    useState<PackageCategory[]>([]);

  const [selectedServices, setSelectedServices] =
    useState<
      Record<string, PackageProvider>
    >({});

  const [step, setStep] =
    useState<"build" | "review">("build");

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);

        const data =
          await getPackageProviders(
            packageId,
            stateId,
            districtId,
            locationId,
            eventDate
          );

        setCategories(data);
      } catch (error) {
        console.error(
          "Failed to load providers",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, [
    packageId,
    stateId,
    districtId,
    locationId,
    eventDate,
  ]);

  const handleSelectProvider = (
    categoryId: string,
    provider: PackageProvider
  ) => {
    const category = categories.find(
      (c) => c.category_id === categoryId
    );

    // Rooms/People categories shouldn't default to the full guest
    // count once selected - seed a sensible suggested quantity right
    // away, same as what the (still-hidden) quantity input would show.
    const suggestedQuantity = needsPerItemQuantity(
      category?.category_name
    )
      ? suggestedQuantityFor(
          category?.category_name,
          guestCount,
          provider.occupancy_per_room,
          provider.min_quantity
        )
      : provider.quantity;

    setSelectedServices((prev) => ({
      ...prev,
      [categoryId]: {
        ...provider,
        category_id: categoryId,
        category_name: category?.category_name,
        quantity: suggestedQuantity,
      },
    }));
  };

  const handleQuantityChange = (categoryId: string, quantity: number) => {
    setSelectedServices((prev) => {
      const existing = prev[categoryId];

      if (!existing) return prev;

      return {
        ...prev,
        [categoryId]: { ...existing, quantity },
      };
    });
  };

  const handleContinue = async () => {
    if (Object.keys(selectedServices).length === 0) {
      toast.error("Please select at least one provider before continuing");
      return;
    }

    const missingRequired = categories.filter(
      (category) =>
        category.required &&
        !selectedServices[category.category_id]
    );

    if (missingRequired.length > 0) {
      const proceed = await confirmDialog(
        `You haven't selected a provider for: ${missingRequired
          .map(
            (category) =>
              category.category_name || category.category_id
          )
          .join(", ")}. Continue anyway?`
      );

      if (!proceed) return;
    }

    setStep("review");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        Loading package...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Build Your Package
        </h1>

        <p className="mt-2 text-gray-600">
          Choose the best providers for
          your event.
          {eventDate && (
            <>
              {" "}Showing providers available on{" "}
              <span className="font-semibold text-[#1E3A8A]">
                {new Date(eventDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              .
            </>
          )}
        </p>
      </div>

      {step === "review" ? (
        <BookingReview
          selectedServices={selectedServices}
          guestCount={guestCount}
          packageName={packageName}
          initialEventDate={eventDate}
          onBack={() => setStep("build")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Left */}
          <div className="space-y-6 lg:col-span-3">
            {categories.map(
              (category) => (
                <CategorySection
                  key={
                    category.category_id
                  }
                  category={category}
                  selectedServices={
                    selectedServices
                  }
                  guestCount={guestCount}
                  onSelectProvider={
                    handleSelectProvider
                  }
                  onQuantityChange={
                    handleQuantityChange
                  }
                />
              )
            )}
          </div>

          {/* Right */}
          <div>
            <BudgetSummary
              budget={budget}
              selectedServices={
                selectedServices
              }
              guestCount={guestCount}
              onContinue={handleContinue}
            />
          </div>
        </div>
      )}
    </div>
  );
}
