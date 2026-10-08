"use client";
import { API_GATEWAY_URL } from "@/lib/apiClient";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StateItem {
  id: number;
  name: string;
}

interface DistrictItem {
  id: number;
  name: string;
}

interface LocationItem {
  id: number;
  name: string;
}

const CATALOG_API =
  process.env.NEXT_PUBLIC_CATALOG_API_URL ||
  API_GATEWAY_URL;

export default function LocationManagementPage() {
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);

  const [selectedState, setSelectedState] =
    useState<number>();

  const [selectedDistrict, setSelectedDistrict] =
    useState<number>();

  const [newLocation, setNewLocation] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  const loadStates = async () => {
    try {
      const response = await fetch(
        `${CATALOG_API}/locations/states`
      );

      const data = await response.json();

      setStates(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadDistricts = async (
    stateId: number
  ) => {
    try {
      const response = await fetch(
        `${CATALOG_API}/locations/states/${stateId}/districts`
      );

      const data = await response.json();

      setDistricts(data);
      setLocations([]);
      setSelectedDistrict(undefined);
    } catch (error) {
      console.error(error);
    }
  };

  const loadLocations = async (
    districtId: number
  ) => {
    try {
      const response = await fetch(
        `${CATALOG_API}/locations/districts/${districtId}/locations`
      );

      const data = await response.json();

      setLocations(data);
    } catch (error) {
      console.error(error);
    }
  };
 useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      loadDistricts(selectedState);
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedDistrict) {
      loadLocations(selectedDistrict);
    }
  }, [selectedDistrict]);
  
  const createLocation = async () => {
    if (!selectedDistrict || !newLocation.trim()) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${CATALOG_API}/locations/admin/locations`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            district_id: selectedDistrict,
            name: newLocation,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to create location"
        );
      }

      setNewLocation("");

      await loadLocations(
        selectedDistrict
      );
    } catch (error) {
      console.error(error);
      alert(
        "Failed to create location"
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteLocation = async (
    locationId: number
  ) => {
    const confirmed = window.confirm(
      "Delete this location?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await fetch(
        `${CATALOG_API}/locations/admin/locations/${locationId}`,
        {
          method: "DELETE",
        }
      );

      if (selectedDistrict) {
        await loadLocations(
          selectedDistrict
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8">

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#1F2937]">
            Location Management
          </h1>

          <p className="text-gray-500 mt-2">
            Manage states, districts
            and locations
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="bg-[#1E3A8A] hover:bg-[#182E6E] text-white px-5 py-3 rounded-xl font-semibold transition whitespace-nowrap"
        >
          Go to Dashboard
        </Link>
      </div>

      {/* Filters */}

      <div className="grid md:grid-cols-2 gap-6 mb-8">

        <div>
          <label className="block mb-2 font-medium">
            State
          </label>

          <select
            value={selectedState ?? ""}
            onChange={(e) =>
              setSelectedState(
                Number(e.target.value)
              )
            }
            className="
              w-full
              border
              rounded-lg
              px-4
              py-3
            "
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

        <div>
          <label className="block mb-2 font-medium">
            District
          </label>

          <select
            value={
              selectedDistrict ?? ""
            }
            onChange={(e) =>
              setSelectedDistrict(
                Number(e.target.value)
              )
            }
            className="
              w-full
              border
              rounded-lg
              px-4
              py-3
            "
          >
            <option value="">
              Select District
            </option>

            {districts.map(
              (district) => (
                <option
                  key={district.id}
                  value={district.id}
                >
                  {district.name}
                </option>
              )
            )}
          </select>
        </div>

      </div>

      {/* Add Location */}

      <div
        className="
          bg-white
          rounded-2xl
          shadow
          p-6
          mb-8
        "
      >
        <h2 className="text-xl font-semibold mb-4">
          Add Location
        </h2>

        <div className="flex gap-4">

          <input
            value={newLocation}
            onChange={(e) =>
              setNewLocation(
                e.target.value
              )
            }
            placeholder="Location name"
            className="
              flex-1
              border
              rounded-lg
              px-4
              py-3
            "
          />

          <button
            onClick={
              createLocation
            }
            disabled={
              loading ||
              !selectedDistrict
            }
            className="
              bg-[#1E3A8A]
              text-white
              px-6
              py-3
              rounded-lg
              hover:bg-[#182E6E]
            "
          >
            Add
          </button>

        </div>

      </div>

      {/* Locations */}

      <div
        className="
          bg-white
          rounded-2xl
          shadow
          p-6
        "
      >
        <h2 className="text-xl font-semibold mb-4">
          Locations
        </h2>

        {locations.length === 0 ? (
          <p className="text-gray-500">
            No locations found
          </p>
        ) : (
          <div className="space-y-3">

            {locations.map(
              (location) => (
                <div
                  key={location.id}
                  className="
                    flex
                    items-center
                    justify-between
                    border
                    rounded-lg
                    p-4
                  "
                >
                  <span>
                    {location.name}
                  </span>

                  <button
                    onClick={() =>
                      deleteLocation(
                        location.id
                      )
                    }
                    className="
                      text-red-600
                      hover:text-red-800
                    "
                  >
                    Delete
                  </button>
                </div>
              )
            )}

          </div>
        )}
      </div>

    </div>
  );
}