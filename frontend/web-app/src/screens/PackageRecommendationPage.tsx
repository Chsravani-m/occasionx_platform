"use client";

import { useEffect, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";
import Link from "next/link";

import {
  buildAutoPackage,
  AutoPackageResponse,
} from "@/services/packageApi";
import { getEventTypes } from "@/services/catalogApi";
import { getServicesByCategory } from "@/services/searchApi";
import {
  getStates,
  getDistricts,
  getLocations,
  StateDto,
  DistrictDto,
  LocationDto,
} from "@/services/locationApi";
import {
  EventType,
  PackageCategory,
  PackageProvider,
} from "@/types/package";
import {
  findByAliasedSlug,
  EVENT_TYPE_SLUG_ALIASES,
} from "@/utils/slug";
import {
  calculateEstimatedCost,
  needsPerItemQuantity,
  suggestedQuantityFor,
} from "@/utils/pricing";
import { CategorySection } from "@/components/package-builder/CategorySection";
import { BookingReview } from "@/components/package-builder/BookingReview";
import { useChatContext } from "@/context/ChatContext";
import { getEarliestBookableDate, getLatestBookableDate } from "@/utils/bookingRules";

interface PackageRecommendationPageProps {
  initialEventTypeSlug?: string;
}

interface EditCategory {
  category_id: string;
  category_name: string;
}

export function PackageRecommendationPage({
  initialEventTypeSlug,
}: PackageRecommendationPageProps = {}) {
  const toast = useToast();
  const { setChatContext } = useChatContext();

  const [step, setStep] = useState<"search" | "edit" | "review">(
    "search"
  );

  const [eventTypes, setEventTypes] =
    useState<EventType[]>([]);

  const [eventTypeId, setEventTypeId] =
    useState("");

  const [budget, setBudget] =
    useState<number>(500000);

  const [guestCount, setGuestCount] =
    useState<number>(100);

  const [eventDate, setEventDate] =
    useState<string>("");

    const [states, setStates] =
    useState<StateDto[]>([]);

    const [districts, setDistricts] =
    useState<DistrictDto[]>([]);

    const [locations, setLocations] =
        useState<LocationDto[]>([]);
    const [loading, setLoading] =
        useState(false);

    const [result, setResult] =
        useState<AutoPackageResponse | null>(null);

    const [searched, setSearched] = useState(false);

    const [stateId, setStateId] = useState<number>();

    const [districtId, setDistrictId] = useState<number>();

    const [locationId, setLocationId] = useState<number>();

    const [error, setError] =
        useState("");

    // Edit-step state: lets the customer swap or drop the AI's picks
    // before booking.
    const [editCategories, setEditCategories] =
        useState<EditCategory[]>([]);
    const [activeCategoryIds, setActiveCategoryIds] =
        useState<string[]>([]);
    const [categoryProviders, setCategoryProviders] = useState<
        Record<string, PackageProvider[]>
    >({});
    const [loadingCategoryIds, setLoadingCategoryIds] =
        useState<string[]>([]);
    const [selectedServices, setSelectedServices] = useState<
        Record<string, PackageProvider>
    >({});

useEffect(() => {
    const loadEventTypes = async () => {
      try {
        const data =
          await getEventTypes();

        setEventTypes(data);

        if (initialEventTypeSlug) {
          const match = findByAliasedSlug(
            data,
            initialEventTypeSlug,
            EVENT_TYPE_SLUG_ALIASES
          );

          if (match) {
            setEventTypeId(match.id);
          }
        }

      } catch (err) {
        console.error(err);
        setError(
          "Unable to load event types."
        );
      }
    };

    loadEventTypes();
  }, []);

  useEffect(() => {
  const loadStates = async () => {
    try {
      const data = await getStates();

      setStates(data);

     setStateId(undefined);
    } catch (err) {
      console.error(err);
    }
  };

  loadStates();
}, []);

useEffect(() => {
  if (!stateId) {
    setDistricts([]);
    setLocations([]);
    setDistrictId(undefined);
    setLocationId(undefined);
    return;
  }

  const loadDistricts = async () => {
    const data = await getDistricts(stateId);

    setDistricts(data);
    setDistrictId(undefined);
    setLocationId(undefined);
    setLocations([]);
  };

  loadDistricts();
}, [stateId]);

useEffect(() => {
  if (!districtId) {
    setLocations([]);
    setLocationId(undefined);
    return;
  }

  const loadLocations = async () => {
    const data = await getLocations(districtId);

    setLocations(data);
    setLocationId(undefined);
  };

  loadLocations();
}, [districtId]);

  const eventTypeName = () =>
    eventTypes.find((et) => et.id === eventTypeId)?.name || "Event";

  const handleSearch = async () => {
    try {
      setError("");

      if (!eventTypeId) {
        setError(
          "Please select an event type."
        );
        return;
      }

      if (budget <= 0) {
        setError(
          "Please enter a valid budget."
        );
        return;
      }

      if (guestCount <= 0) {
        setError(
          "Please enter guest count."
        );
        return;
      }
        if (!eventDate) {
        setError("Please select your event date.");
        return;
        }
        if (!stateId || !districtId || !locationId) {
        setError("Please select State, District and Location.");
        return;
        }
      setLoading(true);
      setResult(null);

      const response =
        await buildAutoPackage({
          event_type_id: eventTypeId,
          budget,
          guest_count: guestCount,
          state_id: stateId,
          district_id: districtId,
          location_id: locationId,
          event_date: eventDate
        });

      setSearched(true);
      setResult(response);

      if (response.available) {
        setChatContext({
          event_type_id: eventTypeId,
          event_type_name: eventTypeName(),
          budget,
          guest_count: guestCount,
          state_id: stateId,
          district_id: districtId,
          location_id: locationId,
          event_date: eventDate,
        });
      }
    } catch (err) {
      console.error(err);

      setError(
        "Unable to build a package right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryProviders = async (categoryId: string) => {
    setLoadingCategoryIds((prev) => [...prev, categoryId]);

    try {
      const providers = await getServicesByCategory(categoryId, {
        state: stateId,
        district: districtId,
        location: locationId,
        date: eventDate || undefined,
      });

      setCategoryProviders((prev) => ({
        ...prev,
        [categoryId]: providers,
      }));
    } catch (err) {
      console.error(err);
      setCategoryProviders((prev) => ({
        ...prev,
        [categoryId]: [],
      }));
    } finally {
      setLoadingCategoryIds((prev) =>
        prev.filter((id) => id !== categoryId)
      );
    }
  };

  const handleStartEditing = () => {
    if (!result || !result.available) return;

    const uniqueCategories = new Map<string, string>();

    result.services.forEach((service) => {
      uniqueCategories.set(service.category_id, service.category_name);
    });

    const categories: EditCategory[] = Array.from(
      uniqueCategories.entries()
    ).map(([category_id, category_name]) => ({
      category_id,
      category_name,
    }));

    const initialSelected: Record<string, PackageProvider> = {};

    result.services.forEach((service) => {
      initialSelected[service.category_id] = service;
    });

    setEditCategories(categories);
    setActiveCategoryIds(categories.map((c) => c.category_id));
    setSelectedServices(initialSelected);
    setCategoryProviders({});
    setStep("edit");

    categories.forEach((c) => void loadCategoryProviders(c.category_id));
  };

  const toggleCategory = (categoryId: string) => {
    if (activeCategoryIds.includes(categoryId)) {
      setActiveCategoryIds((prev) =>
        prev.filter((id) => id !== categoryId)
      );

      setSelectedServices((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });

      return;
    }

    setActiveCategoryIds((prev) => [...prev, categoryId]);

    if (!categoryProviders[categoryId]) {
      void loadCategoryProviders(categoryId);
    }
  };

  const handleSelectProvider = (
    categoryId: string,
    provider: PackageProvider
  ) => {
    const category = editCategories.find(
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

    setChatContext({
      category_id: categoryId,
      category_name: category?.category_name,
    });
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

  const editServices = Object.values(selectedServices);

  const editTotal = editServices.reduce(
    (sum, item) =>
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

  const editPackageCategories: PackageCategory[] = activeCategoryIds.map(
    (categoryId) => {
      const category = editCategories.find(
        (c) => c.category_id === categoryId
      );

      return {
        category_id: categoryId,
        category_name: category?.category_name,
        required: false,
        providers: categoryProviders[categoryId] || [],
      };
    }
  );

  const handleContinueToReview = () => {
    if (editServices.length === 0) {
      toast.error("Please keep at least one service before continuing");
      return;
    }

    setStep("review");
  };

  const budgetOptions = [
    100000,
    300000,
    500000,
    600000,
    800000,
    1000000,
    1200000,
    1500000,
    2000000,
  ];

  if (step === "review") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <BookingReview
          selectedServices={selectedServices}
          guestCount={guestCount}
          packageName={`${eventTypeName()} Custom Package`}
          initialEventDate={eventDate}
          onBack={() => setStep("edit")}
        />
      </div>
    );
  }

  if (step === "edit") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <button
          type="button"
          onClick={() => setStep("search")}
          className="mb-4 text-sm font-medium text-[#1E3A8A] hover:text-[#182E6E]"
        >
          ← Back to your details
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#1F2937]">
            Customize Your AI Package
          </h1>

          <p className="mt-2 text-gray-600">
            We picked one provider per category to fit your budget -
            swap any of them, or turn a category off entirely.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-3">
            {/* Category on/off toggles */}
            <div className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap gap-2">
                {editCategories.map((category) => (
                  <button
                    key={category.category_id}
                    type="button"
                    onClick={() => toggleCategory(category.category_id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      activeCategoryIds.includes(category.category_id)
                        ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                        : "bg-white hover:bg-[#F2F3F8]"
                    }`}
                  >
                    {category.category_name}
                  </button>
                ))}
              </div>
            </div>

            {editPackageCategories.map((category) => (
              <div key={category.category_id}>
                {loadingCategoryIds.includes(category.category_id) ? (
                  <div className="rounded-xl border bg-white p-5 text-sm text-gray-500">
                    Loading providers for {category.category_name}...
                  </div>
                ) : (
                  <CategorySection
                    category={category}
                    selectedServices={selectedServices}
                    guestCount={guestCount}
                    onSelectProvider={handleSelectProvider}
                    onQuantityChange={handleQuantityChange}
                  />
                )}
              </div>
            ))}
          </div>

          <div>
            <div className="sticky top-24 rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                Your Package
              </h2>

              <div className="space-y-2">
                {editServices.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No services selected.
                  </p>
                )}

                {editServices.map((service) => (
                  <div
                    key={service.service_id}
                    className="flex justify-between text-sm"
                  >
                    <span>{service.provider_name}</span>

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
                <span>Estimated Total</span>
                <span>₹{editTotal.toLocaleString("en-IN")}</span>
              </div>

              <button
                disabled={editServices.length === 0}
                onClick={handleContinueToReview}
                className="mt-4 w-full rounded-lg bg-[#1E3A8A] px-4 py-3 text-white hover:bg-[#182E6E] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Header */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Build Your Event Package
            </h1>

            <p className="mt-2 text-slate-600">
              Tell us your budget and event details - we'll assemble a
              custom package from real, available providers.
            </p>
          </div>

          <Link
            href="/packages/build-your-own"
            className="whitespace-nowrap rounded-xl border border-[#1E3A8A] px-5 py-2.5 font-semibold text-[#1E3A8A] transition hover:bg-white"
          >
            Prefer to pick your own services? →
          </Link>
        </div>

        {/* Search Card */}

        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          {/* Row 1: Event Type, Event Date, Guests */}
          <div className="grid gap-6 md:grid-cols-3">

            {/* Event Type */}

            <div className="space-y-3">
              <label className="font-medium">
                Event Type
              </label>

              <select
                value={eventTypeId}
                onChange={(e) =>
                  setEventTypeId(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border p-3"
              >
                <option value="">
                    Select Event Type
                </option>
                {eventTypes.map(
                  (eventType) => (
                    <option
                      key={eventType.id}
                      value={eventType.id}
                    >
                      {eventType.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Event Date */}

            <div className="space-y-3">
              <label className="font-medium">
                Event Date
              </label>

              <input
                type="date"
                value={eventDate}
                // Whole-event filter picked before a category is chosen
                // - see the matching comment in BuildYourPackagePage.tsx.
                min={getEarliestBookableDate()}
                max={getLatestBookableDate()}
                onChange={(e) =>
                  setEventDate(e.target.value)
                }
                className="w-full rounded-lg border p-3"
              />
            </div>

            {/* Guests */}

            <div className="space-y-3">
              <label className="font-medium">
                Guests
              </label>

              <div className="flex h-[50px] items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setGuestCount(Math.max(50, guestCount - 50))
                  }
                  className="h-10 w-10 rounded-full border text-lg hover:bg-slate-100"
                >
                  −
                </button>

                <div className="min-w-16 text-center text-xl font-semibold">
                  {guestCount}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setGuestCount(guestCount + 50)
                  }
                  className="h-10 w-10 rounded-full border text-lg hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>

          </div>

          {/* Budget */}

          <div className="mt-6 space-y-3 border-t pt-6">
            <label className="font-medium">
              Budget (₹)
            </label>

            <input
              type="range"
              min={50000}
              max={5000000}
              step={50000}
              value={budget}
              onChange={(e) =>
                setBudget(Number(e.target.value))
              }
              className="w-full"
            />

            <div className="text-xl font-semibold text-[#182E6E]">
              ₹{budget.toLocaleString("en-IN")}
            </div>

            <div className="flex flex-wrap gap-2">
              {budgetOptions.map((amount) => (
                <button
                  type="button"
                  key={amount}
                  onClick={() => setBudget(amount)}
                  className={`rounded-full border px-4 py-2 text-sm transition
                    ${
                      budget === amount
                        ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                        : "bg-white hover:bg-slate-100"
                    }`}
                >
                  ₹{amount.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: State, District, Location */}
          <div className="mt-6 grid gap-6 border-t pt-6 md:grid-cols-3">

            {/* State */}

            <div className="space-y-3">
              <label className="font-medium">
                State
              </label>

              <select
                value={stateId ?? ""}
                onChange={(e) =>
                  setStateId(Number(e.target.value))
                }
                className="w-full rounded-lg border p-3"
              >
                <option value="">
                    Select State
                </option>
                {states.map((state) => (
                <option
                    key={state.id}
                    value={state.id}
                >
                    {state.name}
                </option>
                ))}
              </select>
            </div>

            {/* District */}

            <div className="space-y-3">
              <label className="font-medium">
                District
              </label>

              <select
                value={districtId ?? ""}
                disabled={!stateId}
                onChange={(e) =>
                  setDistrictId(Number(e.target.value))
                }
                className="w-full rounded-lg border p-3"
              >
                <option value="">
                    Select District
                </option>

                {districts.map((district) => (
                <option
                    key={district.id}
                    value={district.id}
                >
                    {district.name}
                </option>
                ))}
              </select>
            </div>

            {/* Location */}

            <div className="space-y-3">
              <label className="font-medium">
                Location
              </label>

              <select
                value={locationId ?? ""}
                disabled={!districtId}
                onChange={(e) =>
                  setLocationId(Number(e.target.value))
                }
                className="w-full rounded-lg border p-3"
              >
                <option value="">
                    Select Location
                </option>

                {locations.map((location) => (
                <option
                    key={location.id}
                    value={location.id}
                >
                    {location.name}
                </option>
                ))}
              </select>
            </div>

          </div>

          {/* Error */}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-600">
              {error}
            </div>
          )}

          {/* Search */}

          <div className="mt-8 flex justify-end">
            <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="rounded-xl bg-[#1E3A8A] px-8 py-3 text-white font-medium hover:bg-[#182E6E] disabled:bg-gray-400"
            >
                {loading
                ? "Building Your Package..."
                : "Find Packages"}
            </button>
            </div>
        </div>

        {/* Result: auto-built package */}

        {result?.available && (
          <div className="mt-10 rounded-2xl border bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-[#C89B3C]">
                  Custom-Built For You
                </span>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {eventTypeName()} Custom Package
                </h2>
              </div>

              <div className="text-right">
                <div className="text-sm text-slate-500">
                  Estimated Cost
                </div>

                <div className="text-2xl font-bold text-[#182E6E]">
                  ₹{result.estimated_cost.toLocaleString("en-IN")}
                </div>

                <div className="text-xs text-slate-400">
                  {result.providers_count} providers selected
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {result.services.map((service) => (
                <div
                  key={service.service_id}
                  className="flex justify-between text-sm text-slate-600"
                >
                  <span className="font-bold text-slate-900">
                    {service.category_name}: {service.provider_name}
                  </span>

                  <span>
                    ₹
                    {result.breakdown
                      .find((b) => b.category === service.category_name)
                      ?.cost.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleStartEditing}
              className="mt-6 w-full rounded-xl bg-[#1E3A8A] py-3 font-semibold text-white transition hover:bg-[#182E6E] md:w-auto md:px-8"
            >
              Customize & Build This Package
            </button>
          </div>
        )}

        {/* Empty / unavailable state */}

        {!loading && result && !result.available && (
          <div className="mt-12 rounded-2xl border border-dashed bg-white p-12 text-center">
            <h3 className="text-lg font-semibold">
              Couldn't build a package
            </h3>

            <p className="mt-2 text-slate-500">
              {result.message ||
                "Try adjusting your budget, location or event type."}
            </p>
          </div>
        )}

        {!loading && !result && (
          <div className="mt-12 rounded-2xl border border-dashed bg-white p-12 text-center">
            <h3 className="text-lg font-semibold">
              {searched
                ? "No package could be built"
                : "No recommendations yet"}
            </h3>

            <p className="mt-2 text-slate-500">
              Choose event details and click{" "}
              <strong>Find Packages</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
