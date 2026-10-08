"use client";

import { useEffect, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";

import { CategorySection } from "@/components/package-builder/CategorySection";
import { BookingReview } from "@/components/package-builder/BookingReview";

import {
  getCategories,
  getEventTypes,
  getEventTypeCategories,
  Category,
  EventType,
} from "@/services/catalogApi";
import { getServicesByCategory } from "@/services/searchApi";
import {
  getStates,
  getDistricts,
  getLocations,
  StateDto,
  DistrictDto,
  LocationDto,
} from "@/services/locationApi";

import { PackageCategory, PackageProvider } from "@/types/package";
import {
  calculateEstimatedCost,
  needsPerItemQuantity,
  suggestedQuantityFor,
} from "@/utils/pricing";
import { useChatContext } from "@/context/ChatContext";
import { getEarliestBookableDate, getLatestBookableDate } from "@/utils/bookingRules";

export function BuildYourPackagePage() {
  const toast = useToast();
  const { setChatContext } = useChatContext();

  const [step, setStep] = useState<"build" | "review">("build");

  const [states, setStates] = useState<StateDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);

  const [stateId, setStateId] = useState<number>();
  const [districtId, setDistrictId] = useState<number>();
  const [locationId, setLocationId] = useState<number>();

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [eventTypeId, setEventTypeId] = useState("");
  const [eventTypeCategories, setEventTypeCategories] = useState<
    Category[]
  >([]);
  const [loadingEventTypeCategories, setLoadingEventTypeCategories] =
    useState(false);

  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState(100);
  const [budget, setBudget] = useState<number | "">("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
  const [categoryProviders, setCategoryProviders] = useState<
    Record<string, PackageProvider[]>
  >({});
  const [loadingCategoryIds, setLoadingCategoryIds] = useState<string[]>([]);

  const [selectedServices, setSelectedServices] = useState<
    Record<string, PackageProvider>
  >({});

  const locationReady = !!stateId && !!districtId && !!locationId;

  useEffect(() => {
    getStates()
      .then(setStates)
      .catch((err) => console.error(err));

    getCategories()
      .then(setCategories)
      .catch((err) => console.error(err));

    getEventTypes()
      .then(setEventTypes)
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!eventTypeId) {
      setEventTypeCategories([]);
      return;
    }

    setLoadingEventTypeCategories(true);

    getEventTypeCategories(eventTypeId)
      .then(setEventTypeCategories)
      .catch((err) => {
        console.error(err);
        setEventTypeCategories([]);
      })
      .finally(() => setLoadingEventTypeCategories(false));

    // Switching event type changes which categories are suggested -
    // clear any in-progress picks so they aren't left dangling.
    setActiveCategoryIds([]);
    setSelectedServices({});
    setCategoryProviders({});
  }, [eventTypeId]);

  // Once we know the event type's default categories and the customer
  // has picked a location, auto-populate the package with all of them
  // (each still requires the customer to pick a specific provider) -
  // no separate "tap to add" step, and nothing unrelated to this
  // event type is shown.
  useEffect(() => {
    if (!locationReady || eventTypeCategories.length === 0) return;

    const ids = eventTypeCategories.map((c) => c.id);

    setActiveCategoryIds(ids);

    ids.forEach((id) => {
      if (!categoryProviders[id]) {
        void loadCategoryProviders(id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeCategories, locationReady]);

  useEffect(() => {
    if (!stateId) {
      setDistricts([]);
      setDistrictId(undefined);
      setLocations([]);
      setLocationId(undefined);
      return;
    }

    getDistricts(stateId)
      .then(setDistricts)
      .catch((err) => console.error(err));
  }, [stateId]);

  useEffect(() => {
    if (!districtId) {
      setLocations([]);
      setLocationId(undefined);
      return;
    }

    getLocations(districtId)
      .then(setLocations)
      .catch((err) => console.error(err));
  }, [districtId]);

  // Keep the chatbot's context in sync with what's picked here, so it
  // can answer budget questions with real numbers once there's enough
  // to work with.
  useEffect(() => {
    if (!eventTypeId || !locationReady || budget === "" || !budget) {
      return;
    }

    setChatContext({
      event_type_id: eventTypeId,
      event_type_name: eventTypes.find((et) => et.id === eventTypeId)
        ?.name,
      budget,
      guest_count: guestCount,
      state_id: stateId,
      district_id: districtId,
      location_id: locationId,
      event_date: eventDate || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    eventTypeId,
    locationReady,
    budget,
    guestCount,
    stateId,
    districtId,
    locationId,
    eventDate,
  ]);

  const loadCategoryProviders = async (categoryId: string) => {
    if (!locationReady) return;

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
    const category = categories.find((c) => c.id === categoryId);

    // Rooms/People categories shouldn't default to the full guest
    // count once selected - seed a sensible suggested quantity right
    // away, same as what the (still-hidden) quantity input would show.
    const suggestedQuantity = needsPerItemQuantity(category?.name)
      ? suggestedQuantityFor(
          category?.name,
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
        category_name: category?.name,
        quantity: suggestedQuantity,
      },
    }));

    setChatContext({
      category_id: categoryId,
      category_name: category?.name,
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

  const services = Object.values(selectedServices);

  const total = services.reduce(
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

  const handleContinue = () => {
    if (services.length === 0) {
      toast.error("Please select at least one service before continuing");
      return;
    }

    if (!eventDate) {
      toast.error("Please select your event date");
      return;
    }

    setStep("review");
  };

  const packageCategories: PackageCategory[] = activeCategoryIds.map(
    (categoryId) => {
      const category = categories.find((c) => c.id === categoryId);

      return {
        category_id: categoryId,
        category_name: category?.name,
        required: false,
        providers: categoryProviders[categoryId] || [],
      };
    }
  );

  if (step === "review") {
    const eventTypeName = eventTypes.find(
      (et) => et.id === eventTypeId
    )?.name;

    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <BookingReview
          selectedServices={selectedServices}
          guestCount={guestCount}
          packageName={
            eventTypeName
              ? `${eventTypeName} - Build Your Own Package`
              : "Build Your Own Package"
          }
          initialEventDate={eventDate}
          onBack={() => setStep("build")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1F2937]">
          Build Your Own Package
        </h1>

        <p className="mt-2 text-gray-600">
          Pick only the services you need - venue, catering, décor and
          more - and we&apos;ll total it up as you go.
        </p>
      </div>

      {/* Event details */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <label className="font-medium">Event Type</label>

            <select
              value={eventTypeId}
              onChange={(e) => setEventTypeId(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="">Select Event Type</option>
              {eventTypes.map((eventType) => (
                <option key={eventType.id} value={eventType.id}>
                  {eventType.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="font-medium">Event Date</label>

            <input
              type="date"
              value={eventDate}
              // This is a whole-event date filter picked before any
              // category/provider is chosen, so the strictest per-
              // category minimum (Accommodation/Venue/etc.) isn't known
              // yet - the default 4-day floor keeps the field usable
              // and the actual category-aware minimum is re-enforced
              // per service on the booking review step (and by the
              // backend either way).
              min={getEarliestBookableDate()}
              max={getLatestBookableDate()}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div className="space-y-3">
            <label className="font-medium">Guests</label>

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
                onClick={() => setGuestCount(guestCount + 50)}
                className="h-10 w-10 rounded-full border text-lg hover:bg-slate-100"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 border-t pt-6 md:grid-cols-3">
          <div className="space-y-3">
            <label className="font-medium">Budget (₹) — optional</label>

            <input
              type="number"
              min={0}
              step={5000}
              placeholder="e.g. 500000"
              value={budget}
              onChange={(e) =>
                setBudget(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-full rounded-lg border p-3"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 border-t pt-6 md:grid-cols-3">
          <div className="space-y-3">
            <label className="font-medium">State</label>

            <select
              value={stateId ?? ""}
              onChange={(e) => setStateId(Number(e.target.value))}
              className="w-full rounded-lg border p-3"
            >
              <option value="">Select State</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="font-medium">District</label>

            <select
              value={districtId ?? ""}
              disabled={!stateId}
              onChange={(e) => setDistrictId(Number(e.target.value))}
              className="w-full rounded-lg border p-3"
            >
              <option value="">Select District</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="font-medium">Location</label>

            <select
              value={locationId ?? ""}
              disabled={!districtId}
              onChange={(e) => setLocationId(Number(e.target.value))}
              className="w-full rounded-lg border p-3"
            >
              <option value="">Select Location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!eventTypeId ? (
          <p className="mt-4 text-sm text-gray-500">
            Select your Event Type above so we can suggest the right
            services.
          </p>
        ) : (
          !locationReady && (
            <p className="mt-4 text-sm text-gray-500">
              Select your State, District and Location to start adding
              services.
            </p>
          )
        )}
      </div>

      {/* Loading / empty states for the auto-populated services */}
      {eventTypeId && locationReady && loadingEventTypeCategories && (
        <p className="mt-6 text-sm text-gray-500">
          Loading services for this event...
        </p>
      )}

      {eventTypeId &&
        locationReady &&
        !loadingEventTypeCategories &&
        eventTypeCategories.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed bg-white p-10 text-center">
            <p className="text-gray-600">
              No default services are set up for this event type yet.
            </p>
          </div>
        )}

      {/* Category selections + summary */}
      {activeCategoryIds.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-3">
            {packageCategories.map((category) => (
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
                    onRemove={() => toggleCategory(category.category_id)}
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
                {services.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No services selected yet.
                  </p>
                )}

                {services.map((service) => (
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
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>

              {budget !== "" && (
                <div className="mt-3 rounded-lg bg-[#F8F6F2] p-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Your Budget</span>
                    <span>₹{budget.toLocaleString("en-IN")}</span>
                  </div>

                  <div
                    className={`mt-1 flex justify-between font-medium ${
                      total > budget ? "text-red-600" : "text-[#16A34A]"
                    }`}
                  >
                    <span>
                      {total > budget ? "Over budget by" : "Remaining"}
                    </span>
                    <span>
                      ₹
                      {Math.abs(budget - total).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              <button
                disabled={services.length === 0}
                onClick={handleContinue}
                className="mt-4 w-full rounded-lg bg-[#1E3A8A] px-4 py-3 text-white hover:bg-[#182E6E] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
