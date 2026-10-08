import { api } from "./client";

export interface StateDto {
  id: number;
  name: string;
}

export interface DistrictDto {
  id: number;
  name: string;
}

export interface LocationDto {
  id: number;
  name: string;
}

// Cascading state -> district -> location pickers, used by provider
// registration to collect the structured location the catalog's
// search/filtering relies on (separate from the free-text GPS-based
// resolveLocation() below, which is customer-side only).
export async function getStates(): Promise<StateDto[]> {
  const res = await api.get<StateDto[]>("/locations/states");
  return res.data;
}

export async function getDistricts(stateId: number): Promise<DistrictDto[]> {
  const res = await api.get<DistrictDto[]>(`/locations/states/${stateId}/districts`);
  return res.data;
}

export async function getLocations(districtId: number): Promise<LocationDto[]> {
  const res = await api.get<LocationDto[]>(`/locations/districts/${districtId}/locations`);
  return res.data;
}

export interface LocationResolveResult {
  matched: boolean;
  state_id?: number | null;
  district_id?: number | null;
  state_name?: string | null;
  district_name?: string | null;
}

// Turns a free-text district/state name (from reverse-geocoding the
// customer's GPS position, or their manually-typed location) into the
// catalog's own state_id/district_id, so provider listings can be
// scoped to the customer's own area. matched: false when nothing close
// enough was found - callers should skip location filtering in that
// case rather than showing zero results. Mirrors
// web-app/src/services/locationApi.ts's resolveLocation exactly (same
// backend endpoint, same shape).
export async function resolveLocation(
  district: string,
  state?: string
): Promise<LocationResolveResult> {
  const res = await api.get<LocationResolveResult>("/locations/resolve", {
    params: {
      district,
      ...(state ? { state } : {}),
    },
  });
  return res.data;
}
