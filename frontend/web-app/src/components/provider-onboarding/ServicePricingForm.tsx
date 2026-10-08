"use client";

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";

import { useToast, useConfirm } from "@/context/NotificationContext";
import {
  createPricing,
  getServicePricing,
  deletePricing,
  type PricingType,
} from "@/services/providerPricingApi";
import {
  getAllowedPricingTypes,
  PRICING_TYPE_LABELS,
} from "@/utils/pricingTypeSchema";

const ACCOMMODATION_CATEGORY = "Accommodation";
const MAX_OCCUPANCY_PER_ROOM = 4;

interface ServiceLike {
  id: string;
  name: string;
}

interface Pricing {
  id: string;
  pricing_type: string;
  amount: number;
  currency: string;
  unit?: string;
  min_quantity?: number;
  max_quantity?: number;
  description?: string;
  occupancy_per_room?: number;
  total_rooms?: number;
}

interface ServicePricingFormProps {
  service: ServiceLike;
  categoryName: string;
  onClose: () => void;
  onChanged: (count: number) => void;
}

// Modal for managing a single service's pricing records. A service can
// have several pricing entries (e.g. an Hourly rate and a Package
// rate), so this mirrors the old standalone Pricing tab's list + add
// form, just scoped to one service and opened from the Services page
// instead of living in its own nav tab.
export default function ServicePricingForm({
  service,
  categoryName,
  onClose,
  onChanged,
}: ServicePricingFormProps) {
  const toast = useToast();
  const confirmDialog = useConfirm();

  const isAccommodationService = categoryName === ACCOMMODATION_CATEGORY;

  const allowedPricingTypes = getAllowedPricingTypes(categoryName);

  const [pricingList, setPricingList] = useState<Pricing[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [pricingType, setPricingType] = useState<PricingType>(
    allowedPricingTypes[0]
  );
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [occupancyPerRoom, setOccupancyPerRoom] = useState("");
  const [totalRooms, setTotalRooms] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPricing = async () => {
    setLoadingList(true);
    try {
      const data = await getServicePricing(service.id);
      setPricingList(data);
      onChanged(data.length);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.id]);

  const resetForm = () => {
    setPricingType(allowedPricingTypes[0]);
    setAmount("");
    setUnit("");
    setMinQuantity("");
    setMaxQuantity("");
    setDescription("");
    setOccupancyPerRoom("");
    setTotalRooms("");
  };

  const handleAdd = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (
      (pricingType === "PER_PLATE" || pricingType === "PER_PERSON") &&
      !maxQuantity
    ) {
      toast.error(
        "Maximum Quantity is required for Per Plate / Per Person " +
          "pricing — set it to the actual number of people this covers."
      );
      return;
    }

    if (
      pricingType === "PER_DAY" &&
      isAccommodationService &&
      occupancyPerRoom &&
      (Number(occupancyPerRoom) < 1 ||
        Number(occupancyPerRoom) > MAX_OCCUPANCY_PER_ROOM)
    ) {
      toast.error(
        `Guests per Room must be between 1 and ${MAX_OCCUPANCY_PER_ROOM}.`
      );
      return;
    }

    if (
      pricingType === "PER_DAY" &&
      isAccommodationService &&
      totalRooms &&
      Number(totalRooms) < 1
    ) {
      toast.error("Total Rooms/Suites must be at least 1.");
      return;
    }

    try {
      setSaving(true);

      await createPricing(service.id, {
        pricing_type: pricingType,
        amount: Number(amount),
        currency: "INR",
        unit,
        min_quantity: minQuantity ? Number(minQuantity) : undefined,
        max_quantity: maxQuantity ? Number(maxQuantity) : undefined,
        description,
        occupancy_per_room:
          pricingType === "PER_DAY" &&
          isAccommodationService &&
          occupancyPerRoom
            ? Number(occupancyPerRoom)
            : undefined,
        total_rooms:
          pricingType === "PER_DAY" && isAccommodationService && totalRooms
            ? Number(totalRooms)
            : undefined,
      });

      resetForm();
      await loadPricing();
      toast.success("Pricing added");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pricingId: string) => {
    if (!(await confirmDialog("Delete this pricing entry?"))) return;

    await deletePricing(pricingId);
    await loadPricing();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-[#1F2937]">Pricing</h2>
            <p className="text-gray-500 mt-1">{service.name}</p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {!loadingList && pricingList.length > 0 && (
          <div className="mt-6 space-y-3">
            {pricingList.map((pricing) => (
              <div
                key={pricing.id}
                className="border rounded-2xl p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">
                    ₹{pricing.amount}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      · {pricing.pricing_type.replace("_", " ")}
                      {pricing.unit ? ` / ${pricing.unit}` : ""}
                    </span>
                  </p>

                  {pricing.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {pricing.description}
                    </p>
                  )}

                  {!!pricing.total_rooms && (
                    <p className="text-sm text-[#16A34A] mt-1">
                      {pricing.total_rooms} room(s)/suite(s) available
                    </p>
                  )}

                  {(!!pricing.min_quantity || !!pricing.max_quantity) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {pricing.min_quantity ? `Min ${pricing.min_quantity}` : ""}
                      {pricing.min_quantity && pricing.max_quantity ? " · " : ""}
                      {pricing.max_quantity ? `Max ${pricing.max_quantity}` : ""}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(pricing.id)}
                  className="text-red-600 hover:text-red-700 flex-shrink-0"
                  aria-label="Delete pricing"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!loadingList && pricingList.length === 0 && (
          <p className="text-gray-500 mt-6">
            No pricing set for this service yet.
          </p>
        )}

        <div className="mt-8 border-t pt-6">
          <h3 className="font-semibold text-[#1F2937] mb-4">
            Add Pricing
          </h3>

          <div className="space-y-4">
            <select
              value={pricingType}
              onChange={(e) => setPricingType(e.target.value as PricingType)}
              className="w-full border rounded-xl p-3"
            >
              {allowedPricingTypes.map((type) => (
                <option key={type} value={type}>
                  {PRICING_TYPE_LABELS[type]}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-xl p-3"
            />

            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit (plate, guest, day, hour)"
              className="w-full border rounded-xl p-3"
            />

            {(pricingType === "PER_PLATE" || pricingType === "PER_PERSON") && (
              <>
                <input
                  type="number"
                  placeholder="Minimum Quantity"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  className="w-full border rounded-xl p-3"
                />

                <input
                  type="number"
                  required
                  placeholder="Maximum Quantity"
                  value={maxQuantity}
                  onChange={(e) => setMaxQuantity(e.target.value)}
                  className="w-full border rounded-xl p-3"
                />

                <p className="text-xs text-gray-500">
                  Maximum Quantity is required for Per Plate / Per Person
                  pricing — set it to the actual number of people this
                  covers.
                </p>
              </>
            )}

            {pricingType === "PER_DAY" && isAccommodationService && (
              <>
                <input
                  type="number"
                  min={1}
                  max={MAX_OCCUPANCY_PER_ROOM}
                  placeholder="Guests per Room (max 4)"
                  value={occupancyPerRoom}
                  onChange={(e) => setOccupancyPerRoom(e.target.value)}
                  className="w-full border rounded-xl p-3"
                />

                <input
                  type="number"
                  min={1}
                  placeholder="Total Rooms/Suites available"
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(e.target.value)}
                  className="w-full border rounded-xl p-3"
                />
              </>
            )}

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full border rounded-xl p-3"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 border rounded-xl py-3 font-medium"
          >
            Done
          </button>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex-1 bg-[#1E3A8A] hover:bg-[#182E6E] text-white rounded-xl py-3 font-semibold disabled:opacity-50"
          >
            {saving ? "Adding..." : "+ Add Pricing"}
          </button>
        </div>
      </div>
    </div>
  );
}
