"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, DollarSign } from "lucide-react";
import { useToast, useConfirm } from "@/context/NotificationContext";

import {
  getProviderServices,
  createProviderService,
  deleteProviderService,
} from "@/services/providerServiceApi";

import {
  createPricing,
  type PricingType,
} from "@/services/providerPricingApi";

import {
  getCategories,
  getSubcategories,
  type Category,
  type Subcategory
} from "@/services/catalogApi";

import { getServiceAttributeSchema } from "@/utils/serviceAttributesSchema";
import {
  getAllowedPricingTypes,
  PRICING_TYPE_LABELS,
} from "@/utils/pricingTypeSchema";
import ServiceAttributesForm from "@/components/provider-onboarding/ServiceAttributesForm";
import ServicePricingForm from "@/components/provider-onboarding/ServicePricingForm";

const ACCOMMODATION_CATEGORY = "Accommodation";
const MAX_OCCUPANCY_PER_ROOM = 4;

interface ProviderService {
  id: string;
  name: string;
  description: string;
  category_id?: string;
  attributes?: Record<string, unknown>;
}

interface ServiceDraftPricing {
  pricing_type: PricingType;
  amount: number;
  unit: string;
  min_quantity?: number;
  max_quantity?: number;
  occupancy_per_room?: number;
  total_rooms?: number;
}

interface ServiceDraft {
  name: string;
  description: string;
  category_id: string;
  subcategory_id?: string;
  pricing: ServiceDraftPricing;
}


export default function ProviderServicesPage() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [services, setServices] =
  useState<ProviderService[]>([]);

const [categories, setCategories] =
  useState<Category[]>([]);

const [subcategories, setSubcategories] =
  useState<Subcategory[]>([]);

const [categoryId, setCategoryId] =
  useState("");

const [subcategoryId, setSubcategoryId] =
  useState("");

const [name, setName] =
  useState("");

const [description, setDescription] =
  useState("");

// Pricing captured alongside the service being drafted - this is set
// once per Add Service submission and snapshotted onto the draft
// (createPricing is fired for it right after createProviderService
// during Save), rather than living on its own setup tab.
const [pricingType, setPricingType] =
  useState<PricingType>("FIXED");

const [amount, setAmount] =
  useState("");

const [unit, setUnit] =
  useState("");

const [minQuantity, setMinQuantity] =
  useState("");

const [maxQuantity, setMaxQuantity] =
  useState("");

const [occupancyPerRoom, setOccupancyPerRoom] =
  useState("");

const [totalRooms, setTotalRooms] =
  useState("");

const [loading, setLoading] =
  useState(false);

const [serviceDrafts, setServiceDrafts] =
  useState<ServiceDraft[]>([]);

const totalServices =
  services.length;

const [error, setError] =
  useState("");

const [specsService, setSpecsService] =
  useState<ProviderService | null>(null);

const categoryNameFor = (
  categoryId?: string
): string =>
  categories.find((c) => c.id === categoryId)?.name ?? "";

const isAccommodationDraft =
  categoryNameFor(categoryId) === ACCOMMODATION_CATEGORY;

// Which Pricing Type options are relevant for the selected category -
// e.g. Catering shouldn't offer Hourly/Per Day, Venue/Accommodation
// shouldn't offer Per Plate.
const allowedPricingTypes = getAllowedPricingTypes(
  categoryNameFor(categoryId)
);

  useEffect(() => {
    if (!allowedPricingTypes.includes(pricingType)) {
      setPricingType(allowedPricingTypes[0]);
    }
    // Only re-run when the allowed set actually changes (i.e. category
    // changes) - not on every pricingType edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

// A "pricing service" for management purposes: services with a pricing
// count we've learned about (by opening the modal), so the button can
// switch from a neutral state to a clear done/missing indicator.
const [pricingCounts, setPricingCounts] = useState<
  Record<string, number>
>({});

const [pricingService, setPricingService] =
  useState<ProviderService | null>(null);

  useEffect(() => {

  const fetchServices = async () => {

    const providerId =
      localStorage.getItem(
        "provider_id"
      );

    if (!providerId) return;

    const data =
      await getProviderServices(
        providerId
      );

    setServices(data);
  };

  void fetchServices();

}, []);

const handleAddService = () => {

  setError("");

  if (!name.trim()) {
    setError(
      "Service name is required"
    );
    return;
  }

  if (!categoryId) {
    setError(
      "Please select a category"
    );
    return;
  }

  if (!amount || Number(amount) <= 0) {
    setError(
      "Enter a price for this service"
    );
    return;
  }

  if (
    (pricingType === "PER_PLATE" || pricingType === "PER_PERSON") &&
    !maxQuantity
  ) {
    setError(
      "Maximum Quantity is required for Per Plate / Per Person " +
        "pricing — set it to the actual number of people this covers."
    );
    return;
  }

  if (
    pricingType === "PER_DAY" &&
    isAccommodationDraft &&
    occupancyPerRoom &&
    (Number(occupancyPerRoom) < 1 ||
      Number(occupancyPerRoom) > MAX_OCCUPANCY_PER_ROOM)
  ) {
    setError(
      `Guests per Room must be between 1 and ${MAX_OCCUPANCY_PER_ROOM}.`
    );
    return;
  }

  if (
    pricingType === "PER_DAY" &&
    isAccommodationDraft &&
    totalRooms &&
    Number(totalRooms) < 1
  ) {
    setError("Total Rooms/Suites must be at least 1.");
    return;
  }

  setServiceDrafts((prev) => [
    ...prev,
    {
      name,
      description,
      category_id: categoryId,
      subcategory_id:
        subcategoryId || undefined,
      pricing: {
        pricing_type: pricingType,
        amount: Number(amount),
        unit,
        min_quantity: minQuantity ? Number(minQuantity) : undefined,
        max_quantity: maxQuantity ? Number(maxQuantity) : undefined,
        occupancy_per_room:
          pricingType === "PER_DAY" &&
          isAccommodationDraft &&
          occupancyPerRoom
            ? Number(occupancyPerRoom)
            : undefined,
        total_rooms:
          pricingType === "PER_DAY" && isAccommodationDraft && totalRooms
            ? Number(totalRooms)
            : undefined,
      },
    },
  ]);

  setName("");
  setDescription("");
  setPricingType("FIXED");
  setAmount("");
  setUnit("");
  setMinQuantity("");
  setMaxQuantity("");
  setOccupancyPerRoom("");
  setTotalRooms("");
};

  const removeDraft = (
  index: number
) => {

  setServiceDrafts(
    prev =>
      prev.filter(
        (_, i) => i !== index
      )
  );
};
const handleSaveAll = async () => {

  const providerId =
    localStorage.getItem(
      "provider_id"
    );

  if (!providerId) {
    toast.error(
      "Provider not found"
    );
    return;
  }

  if (
    serviceDrafts.length === 0
  ) {
    toast.error(
      "Add at least one service"
    );
    return;
  }

  try {

    setLoading(true);

    for (
      const draft
      of serviceDrafts
    ) {

      const { pricing, ...servicePayload } = draft;

      const createdService =
        await createProviderService(
          providerId,
          servicePayload
        );

      await createPricing(createdService.id, {
        pricing_type: pricing.pricing_type,
        amount: pricing.amount,
        currency: "INR",
        unit: pricing.unit,
        min_quantity: pricing.min_quantity,
        max_quantity: pricing.max_quantity,
        occupancy_per_room: pricing.occupancy_per_room,
        total_rooms: pricing.total_rooms,
      });
    }

    setServiceDrafts([]);

    await refreshServices();

    toast.success(
      "Services and pricing created successfully"
    );

  } catch (error) {

    console.error(error);

    toast.error(
      "Failed to save services and pricing"
    );

  } finally {

    setLoading(false);
  }
};

  useEffect(() => {

  const loadCategories = async () => {

    const data =
      await getCategories();

    setCategories(data);
  };

  void loadCategories();

}, []);

useEffect(() => {

  if (!categoryId) return;

  const loadSubcategories =
    async () => {

      const data =
        await getSubcategories(
          categoryId
        );

      setSubcategories(data);
    };

  void loadSubcategories();

}, [categoryId]);

const handleDelete = async (
  serviceId: string
) => {

  if (
    !(await confirmDialog(
      "Delete service?"
    ))
  ) {
    return;
  }

  await deleteProviderService(
    serviceId
  );
  await refreshServices();

};

const refreshServices = async () => {

  const providerId =
    localStorage.getItem(
      "provider_id"
    );

  if (!providerId) return;

  const data =
    await getProviderServices(
      providerId
    );

  setServices(data);
};

  return (
  <div className="max-w-7xl mx-auto p-8">

    <div className="flex items-start justify-between gap-4">

      <div>
        <h1 className="text-3xl font-bold text-[#1F2937]">
          My Services
        </h1>

        <p className="text-gray-500 mt-2">
          Manage the services you offer to customers.
        </p>
      </div>

      {/* Icon-only stats - hover to see the label/count */}

      <div className="flex items-center gap-3 flex-shrink-0">

        <div
          title={`Total Services: ${totalServices}`}
          className="
            relative
            w-12 h-12
            rounded-full
            bg-white
            shadow
            flex items-center justify-center
            text-xl
            cursor-default
          "
        >
          🛠️
          <span
            className="
              absolute -top-1 -right-1
              w-5 h-5
              rounded-full
              bg-[#1E3A8A]
              text-white
              text-[10px]
              font-semibold
              flex items-center justify-center
            "
          >
            {totalServices}
          </span>
        </div>

        <div
          title={`Draft Services: ${serviceDrafts.length}`}
          className="
            relative
            w-12 h-12
            rounded-full
            bg-white
            shadow
            flex items-center justify-center
            text-xl
            cursor-default
          "
        >
          📝
          <span
            className="
              absolute -top-1 -right-1
              w-5 h-5
              rounded-full
              bg-[#1E3A8A]
              text-white
              text-[10px]
              font-semibold
              flex items-center justify-center
            "
          >
            {serviceDrafts.length}
          </span>
        </div>

      </div>

    </div>

      <div className="bg-white rounded-3xl shadow mt-8 p-8">

        <h2 className="text-xl font-semibold mb-6">
          Add Service
        </h2>

        <div className="space-y-4">

          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Service Name"
            className="
              w-full
              border
              rounded-xl
              p-4
            "
          />
        <select
            value={categoryId}
            onChange={(e) =>
                setCategoryId(
                e.target.value
                )
            }
            className="w-full border rounded-xl p-4"
            >
            <option value="">
                Select Category
            </option>

            {categories.map((cat) => (
                <option
                key={cat.id}
                value={cat.id}
                >
                {cat.name}
                </option>
            ))}
            </select>
            <select
                value={subcategoryId}
                onChange={(e) =>
                    setSubcategoryId(
                    e.target.value
                    )
                }
                className="w-full border rounded-xl p-4"
                >
                <option value="">
                    Select Subcategory
                </option>

                {subcategories.map((sub) => (
                    <option
                    key={sub.id}
                    value={sub.id}
                    >
                    {sub.name}
                    </option>
                ))}
                </select>

                <textarea
                    value={description}
                    onChange={(e) =>
                        setDescription(
                        e.target.value
                        )
                    }
                    placeholder="Description"
                    className="
                        w-full
                        border
                        rounded-xl
                        p-4
                    "
                    />

                  {/* Pricing - captured here at creation time instead
                      of on a separate Pricing tab */}

                  <div className="border-t pt-4 mt-2">

                    <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                      <DollarSign size={15} />
                      Pricing
                    </h3>

                    <div className="space-y-4">

                      <select
                        value={pricingType}
                        onChange={(e) =>
                          setPricingType(e.target.value as PricingType)
                        }
                        className="w-full border rounded-xl p-4"
                      >
                        {allowedPricingTypes.map((type) => (
                          <option key={type} value={type}>
                            {PRICING_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>

                      {categoryId && (
                        <p className="text-xs text-gray-400 -mt-2">
                          Pricing options are tailored to the selected
                          category.
                        </p>
                      )}

                      <input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border rounded-xl p-4"
                      />

                      <input
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="Unit (plate, guest, day, hour)"
                        className="w-full border rounded-xl p-4"
                      />

                      {(pricingType === "PER_PLATE" ||
                        pricingType === "PER_PERSON") && (
                        <>
                          <input
                            type="number"
                            placeholder="Minimum Quantity"
                            value={minQuantity}
                            onChange={(e) => setMinQuantity(e.target.value)}
                            className="w-full border rounded-xl p-4"
                          />

                          <input
                            type="number"
                            required
                            placeholder="Maximum Quantity"
                            value={maxQuantity}
                            onChange={(e) => setMaxQuantity(e.target.value)}
                            className="w-full border rounded-xl p-4"
                          />

                          <p className="text-xs text-gray-500">
                            Maximum Quantity is required for Per Plate /
                            Per Person pricing — set it to the actual
                            number of people this covers.
                          </p>
                        </>
                      )}

                      {pricingType === "PER_DAY" && isAccommodationDraft && (
                        <>
                          <input
                            type="number"
                            min={1}
                            max={MAX_OCCUPANCY_PER_ROOM}
                            placeholder="Guests per Room (max 4)"
                            value={occupancyPerRoom}
                            onChange={(e) =>
                              setOccupancyPerRoom(e.target.value)
                            }
                            className="w-full border rounded-xl p-4"
                          />

                          <input
                            type="number"
                            min={1}
                            placeholder="Total Rooms/Suites available"
                            value={totalRooms}
                            onChange={(e) => setTotalRooms(e.target.value)}
                            className="w-full border rounded-xl p-4"
                          />
                        </>
                      )}

                    </div>

                  </div>

                    {error && (
                    <div
                      className="
                        bg-red-50
                        border
                        border-red-200
                        text-red-600
                        rounded-xl
                        p-3
                      "
                    >
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleAddService}
                    className="
                      bg-[#1E3A8A]
                      text-white
                      px-6
                      py-4
                      rounded-xl
                      w-full
                      font-semibold
                    "
                  >
                    + Add Service
                  </button>
        </div>
        {serviceDrafts.length > 0 && (

  <div className="mt-8">

    <div
      className="
        flex
        items-center
        justify-between
        mb-4
      "
    >

      <h3
        className="
          text-lg
          font-semibold
        "
      >
        Services To Be Added
      </h3>

      <span
        className="
          bg-[#1E3A8A]
          text-white
          px-3
          py-1
          rounded-full
          text-sm
        "
      >
        {serviceDrafts.length}
      </span>

    </div>

    <div className="space-y-3">

      {serviceDrafts.map(
        (
          service,
          index
        ) => (

          <div
            key={index}
            className="
              border
              rounded-2xl
              p-4
              bg-[#F8F6F2]
              flex
              justify-between
            "
          >

            <div>

              <p
                className="
                  font-semibold
                "
              >
                {service.name}
              </p>

              <p
                className="
                  text-sm
                  text-gray-500
                  mt-1
                "
              >
                {
                  service.description
                }
              </p>

              <p className="text-sm text-[#1E3A8A] font-medium mt-1">
                ₹{service.pricing.amount}
                {" · "}
                {service.pricing.pricing_type.replace("_", " ")}
                {service.pricing.unit ? ` / ${service.pricing.unit}` : ""}
              </p>

            </div>

            <button
              onClick={() =>
                removeDraft(
                  index
                )
              }
              className="
                text-red-600
              "
            >
              Remove
            </button>

          </div>

        )
      )}

    </div>

    <button
      onClick={handleSaveAll}
      disabled={loading}
      className="
        mt-6
        w-full
        bg-[#1E3A8A]
        text-white
        py-4
        rounded-xl
        font-semibold
      "
    >
      {loading
        ? "Saving..."
        : `Save ${serviceDrafts.length} Services`}
    </button>

  </div>

)}
      </div>

      <div className="mt-8">

        <h2 className="text-xl font-semibold mb-4">
          Existing Services
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          {services.map((service) => (
            <div
              key={service.id}
              className="
                bg-white
                rounded-2xl
                shadow
                p-6
              "
            >
              <h3 className="font-semibold text-lg">
                {service.name}
              </h3>

              <p className="text-gray-500 mt-2">
                {service.description}
              </p>

              <div className="mt-4 flex items-center gap-3">

                {getServiceAttributeSchema(
                  categoryNameFor(service.category_id)
                ) && (
                  <button
                    onClick={() =>
                      setSpecsService(service)
                    }
                    title={
                      service.attributes &&
                      Object.keys(service.attributes).length > 0
                        ? "Edit specifications"
                        : "Add specifications"
                    }
                    className={`
                      inline-flex items-center gap-1.5
                      text-sm font-medium
                      rounded-full px-3 py-1.5
                      ${
                        service.attributes &&
                        Object.keys(service.attributes).length > 0
                          ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      }
                    `}
                  >
                    {service.attributes &&
                    Object.keys(service.attributes).length > 0 ? (
                      <>
                        <Pencil size={14} />
                        Edit Specifications
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        Add Specifications
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setPricingService(service)}
                  title={
                    pricingCounts[service.id] > 0
                      ? "Edit pricing"
                      : "Add pricing"
                  }
                  className={`
                    inline-flex items-center gap-1.5
                    text-sm font-medium
                    rounded-full px-3 py-1.5
                    ${
                      pricingCounts[service.id] > 0
                        ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                        : pricingCounts[service.id] === 0
                        ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }
                  `}
                >
                  <DollarSign size={14} />
                  {pricingCounts[service.id] > 0
                    ? "Pricing Set"
                    : pricingCounts[service.id] === 0
                    ? "Add Pricing"
                    : "Pricing"}
                </button>

                <button
                  onClick={() =>
                    handleDelete(service.id)
                  }
                  className="text-red-600 text-sm"
                >
                  Delete
                </button>

              </div>
            </div>
          ))}

        </div>
      </div>

      {specsService && (
        <ServiceAttributesForm
          service={specsService}
          categoryName={categoryNameFor(
            specsService.category_id
          )}
          onClose={() => setSpecsService(null)}
          onSaved={(attributes) => {
            setServices((prev) =>
              prev.map((s) =>
                s.id === specsService.id
                  ? { ...s, attributes }
                  : s
              )
            );
          }}
        />
      )}

      {pricingService && (
        <ServicePricingForm
          service={pricingService}
          categoryName={categoryNameFor(
            pricingService.category_id
          )}
          onClose={() => setPricingService(null)}
          onChanged={(count) =>
            setPricingCounts((prev) => ({
              ...prev,
              [pricingService.id]: count,
            }))
          }
        />
      )}

    </div>
  );
}