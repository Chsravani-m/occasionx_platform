"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";
import Link from "next/link";

import {
  getEventTypes,
  getEventTypeCategories,
} from "@/services/catalogApi";

import {
  getPackages,
  createPackage,
  updatePackage,
  getPackageCategoryDetails,
  deactivatePackage,
  Package,
  PackageCategoryDetail,
  PackageTier,
} from "@/services/packageApi";

const TIER_OPTIONS: { value: PackageTier; label: string }[] = [
  { value: "BASIC", label: "Basic" },
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
];

interface EventType {
  id: string;
  name: string;
  description?: string | null;
  is_inbuilt?: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
}

interface CategorySelection {
  selected: boolean;
  required: boolean;
}

const emptyForm = {
  name: "",
  description: "",
  event_type_id: "",
  min_budget: "",
  max_budget: "",
  active: true,
  tier: "STANDARD" as PackageTier,
};

export function AdminPackagePage() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [packages, setPackages] = useState<Package[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(
    null
  );

  const [eventCategories, setEventCategories] = useState<Category[]>([]);
  const [categorySelections, setCategorySelections] = useState<
    Record<string, CategorySelection>
  >({});
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const eventTypeName = (id: string) =>
    eventTypes.find((e) => e.id === id)?.name || "Unknown";

  const isEventTypeInbuilt = (id: string) =>
    eventTypes.find((e) => e.id === id)?.is_inbuilt || false;

  const loadData = async () => {
    try {
      const [packagesData, eventTypesData] = await Promise.all([
        getPackages(),
        getEventTypes(),
      ]);

      setPackages(packagesData);
      setEventTypes(eventTypesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const applyEventTypeCategories = async (
    eventTypeId: string,
    preselect?: PackageCategoryDetail[]
  ) => {
    setEventCategories([]);

    if (!eventTypeId) {
      setCategorySelections({});
      return;
    }

    try {
      setCategoriesLoading(true);

      const categories = await getEventTypeCategories(eventTypeId);

      setEventCategories(categories);

      if (preselect && preselect.length > 0) {
        const selections: Record<string, CategorySelection> = {};

        preselect.forEach((item) => {
          selections[item.category_id] = {
            selected: true,
            required: item.required,
          };
        });

        setCategorySelections(selections);
      } else {
        setCategorySelections({});
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories for this event type");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleEventTypeChange = (eventTypeId: string) => {
    setForm((prev) => ({ ...prev, event_type_id: eventTypeId }));
    void applyEventTypeCategories(eventTypeId);
  };

  const handleEdit = async (pkg: Package) => {
    setEditingPackageId(pkg.id);

    setForm({
      name: pkg.name,
      description: pkg.description || "",
      event_type_id: pkg.event_type_id,
      min_budget: String(pkg.min_budget),
      max_budget: String(pkg.max_budget),
      active: pkg.active,
      tier: pkg.tier || "STANDARD",
    });

    setShowCreate(true);

    try {
      const existingCategories = await getPackageCategoryDetails(pkg.id);

      await applyEventTypeCategories(pkg.event_type_id, existingCategories);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load package categories");
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCategorySelections((prev) => {
      const current = prev[categoryId];

      return {
        ...prev,
        [categoryId]: {
          selected: !current?.selected,
          required: current?.required ?? true,
        },
      };
    });
  };

  const toggleRequired = (categoryId: string) => {
    setCategorySelections((prev) => ({
      ...prev,
      [categoryId]: {
        selected: prev[categoryId]?.selected ?? false,
        required: !prev[categoryId]?.required,
      },
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEventCategories([]);
    setCategorySelections({});
    setEditingPackageId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Package name is required");
      return;
    }

    if (!form.event_type_id) {
      toast.error("Please select an event type");
      return;
    }

    const minBudget = Number(form.min_budget);
    const maxBudget = Number(form.max_budget);

    if (!form.min_budget || !form.max_budget || Number.isNaN(minBudget) || Number.isNaN(maxBudget)) {
      toast.error("Please enter a valid budget range");
      return;
    }

    if (minBudget > maxBudget) {
      toast.error("Minimum budget cannot be greater than maximum budget");
      return;
    }

    const selectedCategories = Object.entries(categorySelections)
      .filter(([, value]) => value.selected)
      .map(([categoryId, value]) => ({
        category_id: categoryId,
        required: value.required,
      }));

    if (selectedCategories.length === 0) {
      toast.error("Select at least one category for this package");
      return;
    }

    try {
      setSubmitting(true);

      if (editingPackageId) {
        await updatePackage(editingPackageId, {
          event_type_id: form.event_type_id,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          min_budget: minBudget,
          max_budget: maxBudget,
          active: form.active,
          tier: form.tier,
          categories: selectedCategories,
        });
      } else {
        await createPackage({
          event_type_id: form.event_type_id,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          min_budget: minBudget,
          max_budget: maxBudget,
          tier: form.tier,
          categories: selectedCategories,
        });
      }

      await loadData();

      resetForm();
      setShowCreate(false);

      toast.success(
        editingPackageId
          ? "Package updated successfully"
          : "Package created successfully"
      );
    } catch (error) {
      console.error(error);
      toast.error(
        editingPackageId
          ? "Failed to update package"
          : "Failed to create package"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (pkg: Package) => {
    const confirmed = await confirmDialog({
      message: `Deactivate "${pkg.name}"? It will no longer be recommended to users.`,
      danger: true,
    });

    if (!confirmed) return;

    try {
      await deactivatePackage(pkg.id);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to deactivate package");
    }
  };

  const filteredPackages = useMemo(
    () =>
      packages.filter((pkg) =>
        pkg.name.toLowerCase().includes(search.toLowerCase())
      ),
    [packages, search]
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPackages.length / PAGE_SIZE)
  );

  const paginatedPackages = useMemo(
    () =>
      filteredPackages.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
      ),
    [filteredPackages, page]
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-4xl font-bold text-[#1F2937]">
            Package Management
          </h1>

          <p className="text-gray-500 mt-2">
            Create and manage OccasionX event packages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="
              border
              border-[#1E3A8A]
              text-[#1E3A8A]
              hover:bg-white
              px-6
              py-3
              rounded-xl
              font-semibold
              transition
              whitespace-nowrap
            "
          >
            Go to Dashboard
          </Link>

          <button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="
              bg-[#1E3A8A]
              hover:bg-[#182E6E]
              text-white
              px-6
              py-3
              rounded-xl
              font-medium
              whitespace-nowrap
            "
          >
            + Create Package
          </button>
        </div>

      </div>

      {/* Package Table */}
      <div className="mt-10 bg-white rounded-3xl shadow-sm border overflow-hidden">

        <div className="flex items-center justify-between p-6 border-b">

          <h2 className="text-xl font-semibold">
            Existing Packages
          </h2>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages..."
            className="
              border
              rounded-xl
              px-4
              py-2
              w-72
            "
          />

        </div>

        <table className="w-full">

          <thead className="bg-gray-50">

            <tr className="text-left">

              <th className="p-4">Package</th>

              <th className="p-4">Event</th>

              <th className="p-4">Budget</th>

              <th className="p-4">Status</th>

              <th className="p-4 text-center">
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            {paginatedPackages.length === 0 ? (

              <tr>
                <td
                  colSpan={5}
                  className="
                    text-center
                    py-16
                    text-gray-500
                  "
                >
                  {packages.length === 0
                    ? "No packages created yet."
                    : "No packages match your search."}
                </td>
              </tr>

            ) : (

              paginatedPackages.map((pkg) => (

                <tr key={pkg.id} className="border-t">

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1F2937]">
                        {pkg.name}
                      </span>

                      <span className="bg-[#1E3A8A]/10 text-[#1E3A8A] text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                        {pkg.tier
                          ? pkg.tier.charAt(0) +
                            pkg.tier.slice(1).toLowerCase()
                          : "Standard"}
                      </span>
                    </div>

                    {pkg.description && (
                      <div className="text-sm text-gray-500 mt-1">
                        {pkg.description}
                      </div>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span>{eventTypeName(pkg.event_type_id)}</span>

                      {isEventTypeInbuilt(pkg.event_type_id) && (
                        <span className="bg-[#C89B3C]/10 text-[#C89B3C] text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                          OX In-Built
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-4">
                    ₹{pkg.min_budget.toLocaleString()} - ₹
                    {pkg.max_budget.toLocaleString()}
                  </td>

                  <td className="p-4">
                    <span
                      className={`
                        px-3
                        py-1
                        rounded-full
                        text-sm
                        font-medium
                        ${
                          pkg.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }
                      `}
                    >
                      {pkg.active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => void handleEdit(pkg)}
                        className="
                          px-4
                          py-2
                          rounded-xl
                          border
                          border-gray-300
                          hover:bg-gray-50
                        "
                      >
                        Edit
                      </button>

                      {pkg.active && (
                        <button
                          onClick={() => handleDeactivate(pkg)}
                          className="
                            px-4
                            py-2
                            rounded-xl
                            border
                            border-red-200
                            text-red-600
                            hover:bg-red-50
                          "
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

        {filteredPackages.length > 0 && (
          <div className="flex items-center justify-between border-t p-6">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, filteredPackages.length)} of{" "}
              {filteredPackages.length}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="
                  rounded-xl border px-4 py-2 text-sm font-medium
                  disabled:cursor-not-allowed disabled:opacity-40
                  hover:bg-gray-50
                "
              >
                Previous
              </button>

              <span className="text-sm font-medium text-[#1F2937]">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page >= totalPages}
                className="
                  rounded-xl border px-4 py-2 text-sm font-medium
                  disabled:cursor-not-allowed disabled:opacity-40
                  hover:bg-gray-50
                "
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {showCreate && (

        <div
          className="
            fixed
            inset-0
            bg-black/30
            z-50
            flex
            justify-end
          "
        >

          <div
            className="
              w-[500px]
              bg-white
              h-full
              overflow-y-auto
              shadow-2xl
              p-8
            "
          >

            <div className="flex justify-between items-start">

              <h2 className="text-2xl font-bold text-[#1F2937]">
                {editingPackageId ? "Edit Package" : "Create Package"}
              </h2>

              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
              >
                ✕
              </button>

            </div>

            <div className="mt-8 space-y-5">

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Package Name
                </label>

                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. Classic Wedding Package"
                  className="
                    mt-2
                    w-full
                    border
                    rounded-xl
                    px-4
                    py-3
                  "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="
                    mt-2
                    w-full
                    border
                    rounded-xl
                    px-4
                    py-3
                  "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Event Type
                </label>

                <select
                  value={form.event_type_id}
                  onChange={(e) => void handleEventTypeChange(e.target.value)}
                  className="
                    mt-2
                    w-full
                    border
                    rounded-xl
                    px-4
                    py-3
                  "
                >
                  <option value="">Select event type</option>

                  {eventTypes.map((eventType) => (
                    <option key={eventType.id} value={eventType.id}>
                      {eventType.is_inbuilt
                        ? `${eventType.name} (OX In-Built)`
                        : eventType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Min Budget (₹)
                  </label>

                  <input
                    type="number"
                    value={form.min_budget}
                    onChange={(e) =>
                      setForm({ ...form, min_budget: e.target.value })
                    }
                    className="
                      mt-2
                      w-full
                      border
                      rounded-xl
                      px-4
                      py-3
                    "
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Max Budget (₹)
                  </label>

                  <input
                    type="number"
                    value={form.max_budget}
                    onChange={(e) =>
                      setForm({ ...form, max_budget: e.target.value })
                    }
                    className="
                      mt-2
                      w-full
                      border
                      rounded-xl
                      px-4
                      py-3
                    "
                  />
                </div>

              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Tier
                </label>

                <select
                  value={form.tier}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tier: e.target.value as typeof form.tier,
                    })
                  }
                  className="
                    mt-2
                    w-full
                    border
                    rounded-xl
                    px-4
                    py-3
                  "
                >
                  {TIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-xs text-gray-400">
                  Controls which column this package appears in on the
                  OX In-Built Packages page.
                </p>
              </div>

              {editingPackageId && (
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                  />
                  Active
                </label>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Categories
                </label>

                {!form.event_type_id && (
                  <p className="text-sm text-gray-400 mt-2">
                    Select an event type to see its categories.
                  </p>
                )}

                {categoriesLoading && (
                  <p className="text-sm text-gray-400 mt-2">
                    Loading categories...
                  </p>
                )}

                {!categoriesLoading && form.event_type_id && eventCategories.length === 0 && (
                  <p className="text-sm text-gray-400 mt-2">
                    No categories configured for this event type.
                  </p>
                )}

                <div className="mt-2 space-y-2">

                  {eventCategories.map((category) => {
                    const selection = categorySelections[category.id];

                    return (
                      <div
                        key={category.id}
                        className="
                          flex
                          items-center
                          justify-between
                          border
                          rounded-xl
                          px-4
                          py-3
                        "
                      >
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selection?.selected ?? false}
                            onChange={() => toggleCategory(category.id)}
                          />
                          {category.name}
                        </label>

                        {selection?.selected && (
                          <label className="flex items-center gap-2 text-sm text-gray-500">
                            <input
                              type="checkbox"
                              checked={selection?.required ?? true}
                              onChange={() => toggleRequired(category.id)}
                            />
                            Required
                          </label>
                        )}
                      </div>
                    );
                  })}

                </div>
              </div>

              <button
                disabled={submitting}
                onClick={() => void handleSave()}
                className="
                  w-full
                  bg-[#1E3A8A]
                  hover:bg-[#182E6E]
                  text-white
                  py-3
                  rounded-xl
                  font-medium
                  disabled:opacity-50
                "
              >
                {submitting
                  ? editingPackageId
                    ? "Saving..."
                    : "Creating..."
                  : editingPackageId
                    ? "Save Changes"
                    : "Create Package"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
