"use client";

import React from "react";

export interface State {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
}

export interface Location {
  id: number;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Subcategory {
  id: string;
  name: string;
}

export interface Step2Values {
  category_id: string;
  subcategory_id: string;
  state_id: string;
  district_id: string;
  location_id: string;
  address: string;
  description: string;
}

interface Step2BusinessProps {
  values: Step2Values;

  categories: Category[];
  subcategories: Subcategory[];

  states: State[];
  districts: District[];
  locations: Location[];

  loading: boolean;

  // Not a checkbox - reflects whether the person opened
  // /terms/provider in a new tab and clicked "I Agree" at the end.
  // Driven by the parent's own storage/focus listeners (see
  // src/utils/terms.ts).
  acceptedTerms: boolean;

  onBack: () => void;

  onSubmit: () => void;

  onCategoryChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;

  onSubcategoryChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;

  onStateChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;

  onDistrictChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;

  onLocationChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;

  onTextChange: (
    e: React.ChangeEvent<
      HTMLTextAreaElement
    >
  ) => void;
}

const fieldClass =
  "w-full rounded-xl border border-[#E5E7EB] bg-[#FFFCF8] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]";

export default function Step2Business({
  values,

  categories,
  subcategories,

  states,
  districts,
  locations,

  loading,

  acceptedTerms,

  onBack,
  onSubmit,

  onCategoryChange,
  onSubcategoryChange,
  onStateChange,
  onDistrictChange,
  onLocationChange,
  onTextChange,
}: Step2BusinessProps) {
    
  return (
    <div className="bg-white rounded-3xl shadow-xl p-10">

      <div className="mb-10">

        <h2 className="text-3xl font-bold text-[#1F2937]">
          Business Details
        </h2>

        <p className="text-gray-500 mt-2">
          Help customers discover your business.
        </p>

      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Category */}

        <div>

          <label className="font-semibold text-sm mb-2 block">
            Category
          </label>

          <select
            value={values.category_id}
            onChange={onCategoryChange}
            className={fieldClass}
          >
            <option value="">
              Select Category
            </option>

            {categories.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}

          </select>

        </div>

        {/* Subcategory */}

        <div>

          <label className="font-semibold text-sm mb-2 block">
            Subcategory
          </label>

          <select
            value={values.subcategory_id}
            onChange={onSubcategoryChange}
            disabled={!values.category_id}
            className={`${fieldClass}
            ${
              !values.category_id
                ? "opacity-60 cursor-not-allowed"
                : ""
            }`}
          >
            <option value="">
              Select Subcategory
            </option>

            {subcategories.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}

          </select>

        </div>

        {/* State */}

        <div>

          <label className="font-semibold text-sm mb-2 block">
            State
          </label>

          <select
            value={values.state_id}
            onChange={onStateChange}
            className={fieldClass}
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

        <div>

          <label className="font-semibold text-sm mb-2 block">
            District
          </label>

          <select
            value={values.district_id}
            onChange={onDistrictChange}
            disabled={!values.state_id}
            className={`${fieldClass}
            ${
              !values.state_id
                ? "opacity-60 cursor-not-allowed"
                : ""
            }`}
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

        <div className="md:col-span-2">

          <label className="font-semibold text-sm mb-2 block">
            Location
          </label>

          <select
            value={values.location_id}
            onChange={onLocationChange}
            disabled={!values.district_id}
            className={`${fieldClass}
            ${
              !values.district_id
                ? "opacity-60 cursor-not-allowed"
                : ""
            }`}
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

      {/* Address */}

      <div className="mt-8">

        <label className="font-semibold text-sm mb-2 block">
          Business Address
        </label>

        <textarea
          rows={3}
          name="address"
          value={values.address}
          onChange={onTextChange}
          className={fieldClass}
          placeholder="Enter complete address"
        />

      </div>

      {/* Description */}

      <div className="mt-8">

        <label className="font-semibold text-sm mb-2 block">
          About Your Business
        </label>

        <textarea
          rows={5}
          name="description"
          value={values.description}
          onChange={onTextChange}
          className={fieldClass}
          placeholder="Describe your services..."
        />

      </div>

      {acceptedTerms ? (
        <div className="mt-10 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          ✓ You've agreed to the Service Provider Terms & Conditions.
        </div>
      ) : (
        <div className="mt-10 text-xs text-gray-500 bg-[#F2F3F8] border border-[#B9C1DA] rounded-lg px-3 py-2">
          Please read and agree to our{' '}
          <button
            type="button"
            onClick={() => window.open("/terms/provider", "_blank")}
            className="underline text-[#1E3A8A] font-medium"
          >
            Service Provider Terms & Conditions
          </button>
          {' '}before registering.
        </div>
      )}

      <div className="flex justify-between mt-6">

        <button
          type="button"
          onClick={onBack}
          className="px-8 py-3 rounded-xl border border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#F8F6F2] transition"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !acceptedTerms}
          className="px-10 py-3 rounded-xl bg-[#1E3A8A] text-white hover:bg-[#182E6E] transition disabled:opacity-50"
        >
          {loading
            ? "Creating Account..."
            : "Register Partner"}
        </button>

      </div>

    </div>
  );
}