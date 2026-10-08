"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { useToast } from "@/context/NotificationContext";
import { updateProviderService } from "@/services/providerServiceApi";
import {
  getServiceAttributeSchema,
  type AttributeField,
} from "@/utils/serviceAttributesSchema";

interface ServiceLike {
  id: string;
  name: string;
  attributes?: Record<string, unknown>;
}

interface ServiceAttributesFormProps {
  service: ServiceLike;
  categoryName: string;
  onClose: () => void;
  onSaved: (attributes: Record<string, unknown>) => void;
}

// Renders a category-specific spec form (Venue -> Indoor Capacity/
// Amenities, Catering -> Cuisine/Per Plate pricing, etc.) as a modal,
// pre-filled from the service's saved attributes, and PUTs the whole
// map back on Save. Which fields show up is decided by
// getServiceAttributeSchema() purely from the category name - see
// utils/serviceAttributesSchema.ts for the full list of buckets.
export default function ServiceAttributesForm({
  service,
  categoryName,
  onClose,
  onSaved,
}: ServiceAttributesFormProps) {
  const toast = useToast();

  const sections = getServiceAttributeSchema(categoryName) ?? [];

  const [values, setValues] = useState<Record<string, unknown>>(
    service.attributes ?? {}
  );

  const [saving, setSaving] = useState(false);

  const setValue = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleOption = (key: string, option: string) => {
    setValues((prev) => {
      const current = Array.isArray(prev[key])
        ? (prev[key] as string[])
        : [];

      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];

      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await updateProviderService(service.id, {
        attributes: values,
      });

      toast.success("Specifications saved");
      onSaved(values);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save specifications");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: AttributeField) => {
    if (field.type === "boolean") {
      return (
        <label
          key={field.key}
          className="flex items-center gap-3 py-2 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={Boolean(values[field.key])}
            onChange={(e) => setValue(field.key, e.target.checked)}
            className="w-5 h-5 accent-[#1E3A8A]"
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.type === "number") {
      return (
        <div key={field.key} className="py-2">
          <label className="block text-sm text-gray-600 mb-1">
            {field.label}
          </label>
          <input
            type="number"
            value={
              values[field.key] === undefined || values[field.key] === null
                ? ""
                : String(values[field.key])
            }
            onChange={(e) =>
              setValue(
                field.key,
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="w-full border rounded-xl p-3"
          />
        </div>
      );
    }

    if (field.type === "text") {
      return (
        <div key={field.key} className="py-2">
          <label className="block text-sm text-gray-600 mb-1">
            {field.label}
          </label>
          <input
            type="text"
            value={(values[field.key] as string) ?? ""}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="w-full border rounded-xl p-3"
          />
        </div>
      );
    }

    // checkbox_group
    const selected = Array.isArray(values[field.key])
      ? (values[field.key] as string[])
      : [];

    return (
      <div key={field.key} className="py-2">
        <div className="grid sm:grid-cols-2 gap-y-1">
          {(field.options ?? []).map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 py-1 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(field.key, option)}
                className="w-5 h-5 accent-[#1E3A8A]"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-[#1F2937]">
              Specifications
            </h2>
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

        {sections.length === 0 ? (
          <p className="text-gray-500 mt-6">
            No specification fields are defined for this category yet.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="font-semibold text-[#1F2937] mb-1">
                  {section.title}
                </h3>
                <div className="divide-y">
                  {section.fields.map(renderField)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 border rounded-xl py-3 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || sections.length === 0}
            className="flex-1 bg-[#1E3A8A] hover:bg-[#182E6E] text-white rounded-xl py-3 font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Specifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
