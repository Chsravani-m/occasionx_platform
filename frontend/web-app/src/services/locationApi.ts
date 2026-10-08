import api from "@/lib/apiClient";

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

export const getStates = async (): Promise<StateDto[]> => {
  const res = await api.get<StateDto[]>(
    "/locations/states"
  );

  return res.data;
};

export const getDistricts = async (
  stateId: number
): Promise<DistrictDto[]> => {
  const res = await api.get<DistrictDto[]>(
    `/locations/states/${stateId}/districts`
  );

  return res.data;
};

export const getLocations = async (
  districtId: number
): Promise<LocationDto[]> => {
  const res = await api.get<LocationDto[]>(
    `/locations/districts/${districtId}/locations`
  );

  return res.data;
};

export interface LocationResolveResult {
  matched: boolean;
  state_id?: number | null;
  district_id?: number | null;
  state_name?: string | null;
  district_name?: string | null;
}

// Turns a free-text district/state name (from reverse-geocoding a
// customer's GPS position, or their manually-typed location) into the
// catalog's own state_id/district_id, so the header search bar can
// scope results to the customer's own area. matched: false when
// nothing close enough was found - callers should skip location
// filtering in that case rather than showing zero results.
export const resolveLocation = async (
  district: string,
  state?: string
): Promise<LocationResolveResult> => {
  const res = await api.get<LocationResolveResult>(
    "/locations/resolve",
    {
      params: {
        district,
        ...(state && { state }),
      },
    }
  );

  return res.data;
};

export interface LocationLabel {
  state_name: string | null;
  district_name: string | null;
  location_name: string | null;
}

// The reverse of resolveLocation - turns the numeric ids a provider
// picked from the registration wizard's State/District/City dropdowns
// back into display names, so their profile can show a real
// city/district instead of a placeholder when they left the optional
// free-text Business Address field blank (see ProviderHero.tsx /
// ProviderCard.tsx). Any id can be omitted; unmatched/omitted ids come
// back null rather than erroring.
export const getLocationLabel = async (params: {
  stateId?: number;
  districtId?: number;
  locationId?: number;
}): Promise<LocationLabel> => {
  const res = await api.get<LocationLabel>("/locations/label", {
    params: {
      ...(params.stateId && { state_id: params.stateId }),
      ...(params.districtId && { district_id: params.districtId }),
      ...(params.locationId && { location_id: params.locationId }),
    },
  });

  return res.data;
};

export interface LocationLabelMaps {
  states: Record<string, string>;
  districts: Record<string, string>;
  locations: Record<string, string>;
}

// Batch version of getLocationLabel - a search results grid renders
// many provider cards at once, and firing one request per card would
// mean dozens of round trips for a single page load. Callers collect
// every distinct id they need resolved across the whole list and
// pass them here in one shot; the maps come back keyed by id (as
// strings, since that's how JSON object keys work) so a lookup is
// `maps.districts[String(provider.district_id)]`.
export const getLocationLabels = async (params: {
  stateIds?: number[];
  districtIds?: number[];
  locationIds?: number[];
}): Promise<LocationLabelMaps> => {
  const res = await api.post<LocationLabelMaps>("/locations/labels", {
    state_ids: params.stateIds ?? [],
    district_ids: params.districtIds ?? [],
    location_ids: params.locationIds ?? [],
  });

  return res.data;
};