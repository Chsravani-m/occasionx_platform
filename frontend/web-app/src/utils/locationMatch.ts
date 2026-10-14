// Helpers for turning a browser position + OpenStreetMap (Nominatim)
// address into OccasionX's own State / District / Location records,
// and for keeping the header's location in sync with Quick Search.

export interface NamedRecord {
  id: number;
  name: string;
}

export interface SavedLocation {
  city: string;
  state: string;
  district: string;
  postalCode: string;
}

export const LOCATION_STORAGE_KEY = "ox_location";
export const LOCATION_CHANGED_EVENT = "ox-location-changed";

// Above this, the browser is guessing from Wi-Fi / the internet
// connection rather than a real position (common on laptops), and the
// district can easily be wrong.
export const APPROXIMATE_ACCURACY_METERS = 5000;

// "Ranga Reddy" / "Rangareddy" / "Ranga Reddy District" /
// "Medchal–Malkajgiri" -> comparable keys.
export function normalizePlaceName(name: string | null | undefined): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(district|dist|mandal|tehsil|taluk|urban|rural)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// First record matching any of the candidate names, in order. Empty
// candidates are skipped - an empty name must never "match" anything.
export function matchByName<T extends NamedRecord>(
  records: T[],
  candidates: (string | null | undefined)[]
): T | undefined {
  const keys = candidates
    .map(normalizePlaceName)
    .filter((key) => key.length >= 3);

  for (const key of keys) {
    const exact = records.find((r) => normalizePlaceName(r.name) === key);
    if (exact) return exact;
  }

  for (const key of keys) {
    const partial = records.find((r) => {
      const name = normalizePlaceName(r.name);
      return name.length >= 3 && (name.includes(key) || key.includes(name));
    });
    if (partial) return partial;
  }

  return undefined;
}

// Nominatim address fields, most specific first, for each level.
// In India the district is usually in `state_district`; `county` is
// often a mandal/taluk and `city` a town inside the district.
export function districtCandidates(address: Record<string, string | undefined>) {
  return [
    address.state_district,
    address.county,
    address.city,
    address.town,
    address.village,
  ];
}

export function localityCandidates(address: Record<string, string | undefined>) {
  return [
    address.suburb,
    address.neighbourhood,
    address.quarter,
    address.city_district,
    address.village,
    address.town,
    address.city,
  ];
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<Record<string, string | undefined>> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=en&lat=${latitude}&lon=${longitude}`
  );
  const data = await res.json();
  return data.address || {};
}

// Saves the location the header shows and tells it to refresh, so the
// header and Quick Search never disagree.
export function saveLocation(next: SavedLocation) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); the event still works.
  }
  window.dispatchEvent(
    new CustomEvent<SavedLocation>(LOCATION_CHANGED_EVENT, { detail: next })
  );
}
