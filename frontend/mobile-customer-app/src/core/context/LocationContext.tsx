import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import * as ExpoLocation from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveLocation } from "@/core/api/locationApi";

export interface DetectedLocation {
  city: string;
  state: string;
  district: string;
  postalCode: string;
}

interface LocationContextValue {
  location: DetectedLocation | null;
  resolvedStateId: number | null;
  resolvedDistrictId: number | null;
  loading: boolean;
  // True once we've tried GPS and either the user declined the
  // permission prompt or the lookup itself failed - the caller can use
  // this to nudge the user toward the manual override instead.
  permissionDenied: boolean;
  detectLocation: () => Promise<void>;
  setManualLocation: (cityOrDistrict: string) => Promise<void>;
}

const STORAGE_KEY = "ox_location";

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<DetectedLocation | null>(null);
  const [resolvedStateId, setResolvedStateId] = useState<number | null>(null);
  const [resolvedDistrictId, setResolvedDistrictId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const persist = useCallback(async (loc: DetectedLocation) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      // non-fatal - just means the location won't survive an app restart
    }
  }, []);

  // Resolves a free-text district/state pair against the catalog's own
  // State/District tables so provider listings can be scoped to the
  // customer's area. Fails silently - an unresolved location just means
  // provider listings fall back to unfiltered (every location), same
  // behavior as the web app.
  const resolve = useCallback(async (loc: DetectedLocation) => {
    if (!loc.district) {
      setResolvedStateId(null);
      setResolvedDistrictId(null);
      return;
    }
    try {
      const result = await resolveLocation(loc.district, loc.state || undefined);
      if (result.matched) {
        setResolvedStateId(result.state_id ?? null);
        setResolvedDistrictId(result.district_id ?? null);
      } else {
        setResolvedStateId(null);
        setResolvedDistrictId(null);
      }
    } catch {
      setResolvedStateId(null);
      setResolvedDistrictId(null);
    }
  }, []);

  const detectLocation = useCallback(async () => {
    setLoading(true);
    setPermissionDenied(false);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        return;
      }

      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;

      // Same free reverse-geocoding service the web app uses (see
      // Header.tsx's detectLocation) - no API key needed.
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "OccasionXMobile/1.0" },
      });
      const data = await res.json();
      const address = data?.address ?? {};

      // Prefer the specific locality/area (suburb, neighbourhood,
      // city_district - e.g. "Gachibowli") for what's displayed, over
      // the broad city name ("Hyderabad") - district still uses the
      // broader administrative area regardless, since that's what has
      // to match the catalog's own District table for search
      // filtering to work.
      const cityForDistrict: string =
        address.city || address.town || address.village || address.county || address.state_district || "";

      const city: string =
        address.suburb || address.neighbourhood || address.quarter ||
        address.city_district || cityForDistrict;
      const district: string = address.state_district || address.county || cityForDistrict;
      const postalCode: string = address.postcode || "";
      const state: string = address.state || "";

      const detected: DetectedLocation = { city, state, district, postalCode };
      setLocation(detected);
      await persist(detected);
      await resolve(detected);
    } catch {
      setPermissionDenied(true);
    } finally {
      setLoading(false);
    }
  }, [persist, resolve]);

  // Manual override - the user types a city/area name OR a pincode
  // instead of using GPS. Previously a pincode was stored verbatim as
  // both city and district, so the location pill just showed the raw
  // number back (e.g. "500048") instead of an actual place name. A
  // purely-numeric entry is now forward-geocoded through the same
  // free Nominatim service used for GPS detection above, so it
  // resolves to a real city/district/state either way - only falling
  // back to storing the typed text as-is if that lookup finds
  // nothing.
  const setManualLocation = useCallback(
    async (typed: string) => {
      const trimmed = typed.trim();
      if (!trimmed) return;
      setLoading(true);
      setPermissionDenied(false);

      const isPincode = /^\d{4,8}$/.test(trimmed);

      if (isPincode) {
        try {
          const url =
            `https://nominatim.openstreetmap.org/search?postalcode=${
              encodeURIComponent(trimmed)
            }&country=India&format=jsonv2&addressdetails=1`;
          const res = await fetch(url, {
            headers: { "User-Agent": "OccasionXMobile/1.0" },
          });
          const results = await res.json();
          const address = results?.[0]?.address;

          if (address) {
            // Same suburb-first preference as detectLocation above -
            // a pincode search often resolves to the broad city
            // otherwise (e.g. 500048 -> just "Hyderabad"), which
            // isn't the specific area the pincode actually
            // identifies.
            const cityForDistrict: string =
              address.city || address.town || address.village ||
              address.county || address.state_district || trimmed;
            const city: string =
              address.suburb || address.neighbourhood ||
              address.quarter || address.city_district ||
              cityForDistrict;
            const district: string =
              address.state_district || address.county || cityForDistrict;
            const state: string = address.state || "";

            const detected: DetectedLocation = {
              city,
              state,
              district,
              postalCode: trimmed,
            };
            setLocation(detected);
            await persist(detected);
            await resolve(detected);
            setLoading(false);
            return;
          }
        } catch {
          // Falls through to storing the raw text below.
        }
      }

      const detected: DetectedLocation = { city: trimmed, state: "", district: trimmed, postalCode: "" };
      setLocation(detected);
      await persist(detected);
      await resolve(detected);
      setLoading(false);
    },
    [persist, resolve]
  );

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: DetectedLocation = JSON.parse(saved);
          setLocation(parsed);
          await resolve(parsed);
          setLoading(false);
          return;
        }
      } catch {
        // fall through to a fresh GPS detect
      }
      await detectLocation();
    })();
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: LocationContextValue = {
    location,
    resolvedStateId,
    resolvedDistrictId,
    loading,
    permissionDenied,
    detectLocation,
    setManualLocation,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationContext must be used within LocationProvider");
  return ctx;
}
