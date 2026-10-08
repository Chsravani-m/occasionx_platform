"use client";

import { useEffect, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";

import {
  getEventTypes,
  EventType,
} from "@/services/catalogApi";
import {
  getPackages,
  getPackageCategoryDetails,
  Package,
} from "@/services/packageApi";
import {
  getStates,
  getDistricts,
  getLocations,
  StateDto,
  DistrictDto,
  LocationDto,
} from "@/services/locationApi";
import { findByAliasedSlug } from "@/utils/slug";
import { getEarliestBookableDate, getLatestBookableDate } from "@/utils/bookingRules";

interface InBuiltPackagesPageProps {
  initialEventTypeSlug?: string;
  onSwitchTab?: (tab: "ai-custom" | "build-your-own") => void;
}

type Tier = "Basic" | "Standard" | "Premium";

const TIER_ORDER: Tier[] = ["Basic", "Standard", "Premium"];

const TIER_STYLES: Record<Tier, string> = {
  Basic: "bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]",
  Standard: "bg-[#C89B3C]/10 text-[#C89B3C] border-[#C89B3C]",
  Premium: "bg-[#182E6E]/10 text-[#182E6E] border-[#182E6E]",
};

interface TieredPackage {
  tier: Tier;
  pkg: Package;
  itemsIncluded: string[];
}

const TIER_LABELS: Record<string, Tier> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

function assignTiers(packages: Package[]): TieredPackage[] {
  // Tier is admin-assigned (Package Management -> Tier field), not
  // computed from price - two Wedding packages both marked PREMIUM
  // will both show in the Premium column, sorted cheapest first.
  const sorted = [...packages].sort(
    (a, b) => a.min_budget - b.min_budget
  );

  return sorted.map((pkg) => ({
    tier: TIER_LABELS[pkg.tier] || "Standard",
    pkg,
    itemsIncluded: [],
  }));
}

export function InBuiltPackagesPage({
  initialEventTypeSlug,
  onSwitchTab,
}: InBuiltPackagesPageProps = {}) {
  const toast = useToast();
  const router = useRouter();

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] =
    useState<EventType | null>(null);
  const [loadingEventTypes, setLoadingEventTypes] = useState(true);

  const [tieredPackages, setTieredPackages] = useState<TieredPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [customBudget, setCustomBudget] = useState<number>(0);

  const [states, setStates] = useState<StateDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);

  const [stateId, setStateId] = useState<number>();
  const [districtId, setDistrictId] = useState<number>();
  const [locationId, setLocationId] = useState<number>();

  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState(100);

  const locationReady = !!stateId && !!districtId && !!locationId;

  useEffect(() => {
    async function load() {
      try {
        const [types, allPackages] = await Promise.all([
          getEventTypes(),
          getPackages(),
        ]);

        // Only offer event types that actually have a real, active
        // package built for them - listing one that leads to an empty
        // state isn't useful.
        const eventTypeIdsWithPackages = new Set(
          allPackages
            .filter((p) => p.active)
            .map((p) => p.event_type_id)
        );

        const available = types.filter(
          (et) => et.is_inbuilt && eventTypeIdsWithPackages.has(et.id)
        );

        setEventTypes(available);

        if (initialEventTypeSlug) {
          const match = findByAliasedSlug(
            available,
            initialEventTypeSlug,
            {}
          );

          if (match) setSelectedEventType(match);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingEventTypes(false);
      }
    }

    load();
  }, [initialEventTypeSlug]);

  useEffect(() => {
    getStates()
      .then(setStates)
      .catch((err) => console.error(err));
  }, []);

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

  // Package price ranges/items aren't location-specific - only real
  // provider availability is - so packages for the chosen event type
  // load as soon as it's picked, without waiting on location.
  useEffect(() => {
    if (!selectedEventType) {
      setTieredPackages([]);
      return;
    }

    async function loadPackages() {
      try {
        setLoadingPackages(true);

        const allPackages = await getPackages();

        const matching = allPackages.filter(
          (p) =>
            p.active &&
            selectedEventType &&
            p.event_type_id === selectedEventType.id
        );

        const tiered = assignTiers(matching);

        const withItems = await Promise.all(
          tiered.map(async (entry) => {
            try {
              const categories = await getPackageCategoryDetails(
                entry.pkg.id
              );

              return {
                ...entry,
                itemsIncluded: categories.map((c) => c.category_name),
              };
            } catch (err) {
              console.error(err);
              return entry;
            }
          })
        );

        setTieredPackages(withItems);
      } catch (err) {
        console.error(err);
        setTieredPackages([]);
      } finally {
        setLoadingPackages(false);
      }
    }

    loadPackages();
  }, [selectedEventType]);

  // Clear the selected package type whenever the underlying package
  // list changes (new event type, or packages finished loading), so
  // a tier picked for one event type doesn't linger for another.
  useEffect(() => {
    setSelectedTier(null);
  }, [tieredPackages]);

  // Default the customizable budget to the middle of the selected
  // tier's range whenever the tier (or its packages) change.
  useEffect(() => {
    if (!selectedTier) {
      setCustomBudget(0);
      return;
    }

    const entries = tieredPackages.filter((t) => t.tier === selectedTier);

    if (entries.length === 0) {
      setCustomBudget(0);
      return;
    }

    const min = Math.min(...entries.map((e) => e.pkg.min_budget));
    const max = Math.max(...entries.map((e) => e.pkg.max_budget));

    setCustomBudget(Math.round((min + max) / 2));
  }, [selectedTier, tieredPackages]);

  const handleCustomize = (pkg: Package) => {
    if (!locationReady) {
      toast.error("Please select State, District and Location first.");
      return;
    }

    if (!eventDate) {
      toast.error("Please select your event date.");
      return;
    }

    const budgetToUse = customBudget || pkg.max_budget;

    router.push(
      `/packages/${pkg.id}?state=${stateId}&district=${districtId}&location=${locationId}&budget=${budgetToUse}&eventType=${pkg.event_type_id}&guestCount=${guestCount}&packageName=${encodeURIComponent(pkg.name)}&eventDate=${eventDate}`
    );
  };

  if (loadingEventTypes) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] px-4 py-16 text-center text-[#1E3A8A]">
        Loading event types...
      </div>
    );
  }

  const availableTiers = TIER_ORDER.filter(
    (tier) => tieredPackages.some((t) => t.tier === tier)
  );

  const selectedEntries = selectedTier
    ? tieredPackages.filter((t) => t.tier === selectedTier)
    : [];

  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-10">
      <div className="mx-auto max-w-7xl">

        <h1 className="text-4xl font-bold text-[#1F2937]">
          OX In-Built Packages
        </h1>

        <p className="mt-2 text-gray-600">
          Ready-made templates for every celebration - choose Basic,
          Standard or Premium.
        </p>

        {/* Event details */}
        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#1F2937]">
            Your Event Details
          </h2>

          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-3">
              <label className="font-medium">Event Type</label>

              <select
                value={selectedEventType?.id ?? ""}
                onChange={(e) => {
                  const match = eventTypes.find(
                    (et) => et.id === e.target.value
                  );

                  setSelectedEventType(match ?? null);
                }}
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
              <label className="font-medium">Package Type</label>

              <select
                value={selectedTier ?? ""}
                disabled={!selectedEventType || availableTiers.length === 0}
                onChange={(e) =>
                  setSelectedTier((e.target.value as Tier) || null)
                }
                className="w-full rounded-lg border p-3 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">
                  {!selectedEventType
                    ? "Select Event Type first"
                    : loadingPackages
                    ? "Loading..."
                    : availableTiers.length === 0
                    ? "No packages yet"
                    : "Select Package Type"}
                </option>
                {availableTiers.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="font-medium">Event Date</label>

              <input
                type="date"
                value={eventDate}
                // Whole-event filter picked before a category is chosen
                // - see the matching comment in BuildYourPackagePage.tsx.
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
                onChange={(e) =>
                  setDistrictId(Number(e.target.value))
                }
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
                onChange={(e) =>
                  setLocationId(Number(e.target.value))
                }
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

          {!selectedEventType && (
            <p className="mt-4 text-sm text-gray-500">
              Select your Event Type above to see package types and
              pricing.
            </p>
          )}

          {selectedEventType && !locationReady && (
            <p className="mt-4 text-sm text-gray-500">
              Select your State, District and Location above to
              customize your budget.
            </p>
          )}

          {/* Budget line for the selected package type - only shown
              once location is set - plus the real package(s) in that
              tier once one's picked. */}
          {selectedEventType && locationReady && (
            <div className="mt-6 space-y-3 border-t pt-6">
              {loadingPackages ? (
                <p className="text-sm text-gray-500">
                  Loading packages for this event...
                </p>
              ) : tieredPackages.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-[#F8F6F2] p-5 text-center">
                  <p className="text-gray-600">
                    No {selectedEventType.name} packages have been
                    created yet.
                  </p>

                  <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm font-semibold">
                    <button
                      type="button"
                      onClick={() => onSwitchTab?.("ai-custom")}
                      className="text-[#1E3A8A] hover:text-[#182E6E]"
                    >
                      Try AI + Custom Packages →
                    </button>

                    <button
                      type="button"
                      onClick={() => onSwitchTab?.("build-your-own")}
                      className="text-[#1E3A8A] hover:text-[#182E6E]"
                    >
                      Build Your Own Package →
                    </button>
                  </div>
                </div>
              ) : !selectedTier ? (
                <p className="text-sm text-gray-500">
                  Select a Package Type above to customize your budget.
                </p>
              ) : (
                (() => {
                  const tierMin = Math.min(
                    ...selectedEntries.map((e) => e.pkg.min_budget)
                  );
                  const tierMax = Math.max(
                    ...selectedEntries.map((e) => e.pkg.max_budget)
                  );

                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${TIER_STYLES[selectedTier]}`}
                        >
                          {selectedTier}
                        </span>

                        <span className="text-sm text-gray-500">
                          {selectedEntries.length} package
                          {selectedEntries.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Customizable budget line */}
                      <div>
                        <label className="font-medium">
                          Customize Your Budget (₹)
                        </label>

                        <input
                          type="range"
                          min={tierMin}
                          max={tierMax}
                          step={Math.max(
                            1000,
                            Math.round((tierMax - tierMin) / 100)
                          )}
                          value={customBudget || tierMin}
                          onChange={(e) =>
                            setCustomBudget(Number(e.target.value))
                          }
                          className="mt-2 w-full accent-[#1E3A8A]"
                        />

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>₹{tierMin.toLocaleString("en-IN")}</span>
                          <span className="text-lg font-semibold text-[#182E6E]">
                            ₹{(customBudget || tierMin).toLocaleString(
                              "en-IN"
                            )}
                          </span>
                          <span>₹{tierMax.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      {/* Real package(s) within the selected tier */}
                      <div className="space-y-4 pt-1">
                        {selectedEntries.map(({ pkg, itemsIncluded }) => (
                          <div
                            key={pkg.id}
                            className="rounded-xl border border-[#E5E7EB] bg-[#F8F6F2] p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <h3 className="text-lg font-bold text-[#1F2937]">
                                  {pkg.name}
                                </h3>

                                <p className="text-sm text-[#1E3A8A]">
                                  {pkg.description ||
                                    "A curated package for your event."}
                                </p>

                                <p className="mt-2 text-sm text-gray-600">
                                  {itemsIncluded.length > 0
                                    ? itemsIncluded.slice(0, 6).join(", ") +
                                      (itemsIncluded.length > 6
                                        ? " and more..."
                                        : "")
                                    : "Category details coming soon."}
                                </p>
                              </div>

                              <div className="text-right">
                                <div className="text-sm text-gray-500">
                                  Package Range
                                </div>
                                <div className="text-lg font-bold text-[#182E6E]">
                                  ₹{pkg.min_budget.toLocaleString("en-IN")}
                                  {" – "}
                                  ₹{pkg.max_budget.toLocaleString("en-IN")}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleCustomize(pkg)}
                              className="mt-4 w-full rounded-xl bg-[#1E3A8A] py-3 font-semibold text-white transition hover:bg-[#182E6E] md:w-auto md:px-8"
                            >
                              Customize Package
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
