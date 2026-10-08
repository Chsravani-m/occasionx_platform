"use client";

import React, {
  useEffect,
  useRef,
  useState
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDashboardRoute } from "@/utils/dashboardRoute";
import { getCategories, getSubcategories, getCategoryTree, Category, Subcategory } from "@/services/catalogApi";
import {
  getUnreadCount,
  getUserNotifications,
  markAllNotificationsRead,
  type Notification,
} from "@/services/notificationApi";
import {
  getCustomerWishlist,
  WISHLIST_UPDATED_EVENT,
} from "@/services/wishlistApi";
import { getCartCount, CART_UPDATED_EVENT } from "@/utils/cart";
import { resolveLocation } from "@/services/locationApi";
import { SESSION_EXPIRED_EVENT } from "@/lib/apiClient";

interface HeaderProps {
  onOpenAll?: () => void;

  detectedLocation: {
    city: string;
    state: string;
    district: string;
    postalCode: string;
  };

  setDetectedLocation: React.Dispatch<
    React.SetStateAction<{
      city: string;
      state: string;
      district: string;
      postalCode: string;
    }>
  >;
}
type User = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

// Lightweight inline SVG icons (no external icon package needed)
const IconSearch = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconMapPin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IconBell = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconHeart = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
  </svg>
);
const IconCart = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39A2 2 0 0 0 9.62 16h9.76a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}


const Header: React.FC<HeaderProps> = ({
  onOpenAll,
  detectedLocation,
  setDetectedLocation
}) => {

  const [location, setLocation] = useState({
    city: "",
    pincode: ""
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  // Once a category is picked, its subcategories power a suggestions
  // dropdown under the existing search input - see the useEffect below
  // that loads them and the searchBoxRef click-outside handler further
  // down that closes the dropdown.
  const [subcategoryId, setSubcategoryId] = useState("");
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Every subcategory across every category, loaded once on mount so
  // typing in the search box suggests something even before "All
  // Categories" has been narrowed down - see the suggestions useMemo
  // below, which uses this instead of `subcategories` when categoryId
  // is still empty.
  const [allSubcategories, setAllSubcategories] = useState<Subcategory[]>([]);
  const [showSubcategorySuggestions, setShowSubcategorySuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Catalog state_id/district_id resolved from detectedLocation's
  // free-text district/state name, so search results can be scoped
  // to the customer's own area. Null until resolved (or if nothing
  // matched), in which case search just runs unfiltered by location.
  const [resolvedLocation, setResolvedLocation] = useState<{
    stateId: number | null;
    districtId: number | null;
  }>({ stateId: null, districtId: null });
  const [cartCount, setCartCount] = useState(0);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const detectLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          
          console.log("Latitude:", latitude);
          console.log("Longitude:", longitude);

          const url =
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

          const res = await fetch(url);

          const data = await res.json();

          console.log(data.address);

          // Prefer the specific locality/area (suburb, neighbourhood,
          // city_district - e.g. "Gachibowli") over the broad city
          // name ("Hyderabad") for what's actually displayed, since a
          // whole city is rarely what someone means by "my location".
          // district stays keyed off the broader administrative area
          // regardless, since that's what has to match the catalog's
          // own District table for search filtering to work - a
          // neighbourhood name like "Gachibowli" wouldn't match
          // anything there.
          const cityForDistrict =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            data.address?.state_district ||
            "";

          const city =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.quarter ||
            data.address?.city_district ||
            cityForDistrict ||
            "Hyderabad";

          const district =
            data.address?.state_district ||
            data.address?.county ||
            cityForDistrict ||
            "";

          const pincode =
            data.address?.postcode ||
            "";

          setLocation({
            city,
            pincode
          });

          setDetectedLocation({
            city,
            state: data.address?.state || "",
            district,
            postalCode: pincode
          });

          setShowLocationModal(false);

        } catch (error) {

          setShowLocationModal(true);

        }
      },
      () => {

        setShowLocationModal(true);

      }
    );
  } else {

    setShowLocationModal(true);

  }
};

// Previously, entering a Pincode in the "Update location" modal did
// nothing useful - Save always used the City text field as the
// district (ignoring the pincode entirely) and kept whatever state
// had been detected earlier, even if it was now stale/wrong. That
// meant typing just a pincode (leaving City blank, or typing a
// different city's pincode) silently produced a broken or unchanged
// location. This now forward-geocodes the pincode via the same
// Nominatim service already used for GPS detection above, so the
// actual city/district/state get derived from the pincode itself
// when one is given. Falls back to the old City-only behavior if no
// pincode was entered or the lookup fails.
const handleSaveLocation = async () => {
  const pincode = location.pincode.trim();

  if (pincode) {
    try {
      setSavingLocation(true);

      const url =
        `https://nominatim.openstreetmap.org/search?postalcode=${
          encodeURIComponent(pincode)
        }&country=India&format=jsonv2&addressdetails=1`;

      const res = await fetch(url);
      const results = await res.json();
      const address = results?.[0]?.address;

      if (address) {
        // Same suburb-first preference as detectLocation above - a
        // pincode search often resolves to the broad city otherwise
        // (e.g. 500048 -> just "Hyderabad"), which isn't the specific
        // area the pincode actually identifies.
        const cityForDistrict =
          address.city ||
          address.town ||
          address.village ||
          address.county ||
          address.state_district ||
          location.city;

        const city =
          address.suburb ||
          address.neighbourhood ||
          address.quarter ||
          address.city_district ||
          cityForDistrict;

        const district =
          address.state_district ||
          address.county ||
          cityForDistrict;

        const state = address.state || detectedLocation.state;

        const next = {
          city,
          state,
          district,
          postalCode: pincode,
        };

        setDetectedLocation(next);
        setLocation({ city, pincode });
        localStorage.setItem("ox_location", JSON.stringify(next));
        setShowLocationModal(false);
        return;
      }
    } catch (err) {
      console.error(err);
      // Falls through to the City-only save below.
    } finally {
      setSavingLocation(false);
    }
  }

  const next = {
    city: location.city,
    state: detectedLocation.state,
    district: location.city,
    postalCode: pincode,
  };

  setDetectedLocation(next);
  localStorage.setItem("ox_location", JSON.stringify(next));
  setShowLocationModal(false);
};

useEffect(() => {

  const savedLocation =
    localStorage.getItem(
      "ox_location"
    );

  let usedSavedLocation = false;

  if (savedLocation) {

    try {

      const parsed =
        JSON.parse(savedLocation);

      setDetectedLocation(parsed);

      setLocation({
        city: parsed.city || "",
        pincode:
          parsed.postalCode || ""
      });

      usedSavedLocation = true;

    } catch (err) {

      console.error(err);
      localStorage.removeItem("ox_location");

    }

  }

  if (!usedSavedLocation) {

    detectLocation();

  }

  const loadUser = () => {

    try {
  const storedUser =
    localStorage.getItem("user");

  if (storedUser) {
    setUser(
      JSON.parse(storedUser)
    );
  }
} catch (err) {
  console.error(err);
  localStorage.removeItem("user");
}
  };

  loadUser();

  getCategories()
    .then(setCategories)
    .catch((err) => console.error(err));

  getCategoryTree()
    .then((tree) => {
      const flattened: Subcategory[] = tree.flatMap((cat) =>
        cat.subcategories.map((s) => ({
          id: s.id,
          category_id: cat.id,
          name: s.name
        }))
      );

      setAllSubcategories(flattened);
    })
    .catch((err) => console.error(err));

  window.addEventListener(
    "focus",
    loadUser
  );

  window.addEventListener(
    "storage",
    loadUser
  );

  return () => {

    window.removeEventListener(
      "focus",
      loadUser
    );

    window.removeEventListener(
      "storage",
      loadUser
    );

  };

}, []);

// Load the picked category's subcategories so the second search box
// can appear - reset any previously chosen subcategory since it
// almost certainly doesn't belong to the new category.
useEffect(() => {
  setSubcategoryId("");

  if (!categoryId) {
    setSubcategories([]);
    return;
  }

  getSubcategories(categoryId)
    .then(setSubcategories)
    .catch((err) => {
      console.error(err);
      setSubcategories([]);
    });
}, [categoryId]);

// apiClient.ts fires this once its own refresh-token attempt has
// failed (expired/revoked refresh token, no network, etc.) after a
// request 401'd - e.g. the wishlist count fetch below, once the
// access token's ~30 min lifetime is up. Bounce the same way a manual
// Logout click does instead of leaving the header showing a signed-in
// user whose session the backend has actually already rejected.
useEffect(() => {

  const handleSessionExpired = () => {
    handleLogout();
  };

  window.addEventListener(
    SESSION_EXPIRED_EVENT,
    handleSessionExpired
  );

  return () => {
    window.removeEventListener(
      SESSION_EXPIRED_EVENT,
      handleSessionExpired
    );
  };

}, []);

// Whenever the detected/saved location's district changes, resolve it
// against the catalog's State/District tables so search can be scoped
// to the customer's own area. Runs client-side only (detectedLocation
// starts empty on the server render) and fails silently - an
// unresolved location just means search falls back to unfiltered.
useEffect(() => {

  if (!detectedLocation.district) {
    setResolvedLocation({ stateId: null, districtId: null });
    return;
  }

  let cancelled = false;

  resolveLocation(detectedLocation.district, detectedLocation.state)
    .then((result) => {
      if (cancelled) return;

      setResolvedLocation(
        result.matched
          ? {
              stateId: result.state_id ?? null,
              districtId: result.district_id ?? null,
            }
          : { stateId: null, districtId: null }
      );
    })
    .catch((err) => {
      console.error(err);
      if (!cancelled) {
        setResolvedLocation({ stateId: null, districtId: null });
      }
    });

  return () => {
    cancelled = true;
  };

}, [detectedLocation.district, detectedLocation.state]);

useEffect(() => {

  if (!user?.id) {
    setUnreadCount(0);
    return;
  }

  const refreshUnreadCount = () => {
    getUnreadCount(user.id as string)
      .then(setUnreadCount)
      .catch((err) => console.error(err));
  };

  refreshUnreadCount();

  const interval = setInterval(
    refreshUnreadCount,
    30000
  );

  return () => clearInterval(interval);

}, [user?.id]);

const [wishlistCount, setWishlistCount] = useState(0);

useEffect(() => {

  const refreshWishlistCount = () => {
    if (!user?.id) {
      setWishlistCount(0);
      return;
    }

    getCustomerWishlist(user.id)
      .then((items) => setWishlistCount(items.length))
      .catch((err) => console.error(err));
  };

  refreshWishlistCount();

  // Wishlist mutations can happen from several other places (heart
  // button on a provider page, "move to wishlist" on the cart page,
  // removals on the wishlist page itself) - re-fetch whenever any of
  // them fire, not just when the logged-in user changes.
  window.addEventListener(WISHLIST_UPDATED_EVENT, refreshWishlistCount);

  return () => {
    window.removeEventListener(
      WISHLIST_UPDATED_EVENT,
      refreshWishlistCount
    );
  };

}, [user?.id]);

useEffect(() => {

  const refreshCartCount = () => setCartCount(getCartCount());

  // Cart is now namespaced per-user (see utils/cart.ts) - getCartCount()
  // already reads 0 while logged out, and switches to the right
  // person's own count as soon as `user` changes, so no manual
  // clearing is needed here anymore.
  refreshCartCount();

  window.addEventListener(CART_UPDATED_EVENT, refreshCartCount);
  window.addEventListener("storage", refreshCartCount);

  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, refreshCartCount);
    window.removeEventListener("storage", refreshCartCount);
  };

}, [user]);

useEffect(() => {

  function handleClickOutside(e: MouseEvent) {
    if (
      notifRef.current &&
      !notifRef.current.contains(e.target as Node)
    ) {
      setShowNotifications(false);
    }
  }

  document.addEventListener(
    "mousedown",
    handleClickOutside
  );

  return () =>
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    );

}, []);

useEffect(() => {

  function handleClickOutsideSearch(e: MouseEvent) {
    if (
      searchBoxRef.current &&
      !searchBoxRef.current.contains(e.target as Node)
    ) {
      setShowSubcategorySuggestions(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutsideSearch);

  return () =>
    document.removeEventListener("mousedown", handleClickOutsideSearch);

}, []);

const toggleNotifications = async () => {

  if (!user?.id) {
    router.push("/signin");
    return;
  }

  const next = !showNotifications;

  setShowNotifications(next);

  if (!next) return;

  try {
    const data = await getUserNotifications(user.id);

    setNotifications(data);

    if (unreadCount > 0) {
      await markAllNotificationsRead(user.id);
      setUnreadCount(0);
    }
  } catch (err) {
    console.error(err);
  }
};

const handleLogout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");

  // Providers log in through this same header/account dropdown (see
  // /provider/login, which sets "user" alongside these) - clear their
  // session keys too so a logged-out provider dashboard/pages don't
  // still think a provider is signed in.
  localStorage.removeItem("provider_id");
  localStorage.removeItem("user_id");

  // Cart is namespaced per-user (see utils/cart.ts) - it deliberately
  // does NOT get cleared here. It stays saved under this account's own
  // key and comes back automatically next time they log back in; a
  // logged-out visitor (or a different account) can't see it since
  // there's no "user" to derive that key from.
  setUser(null);

  router.push("/");
};

// `overrides` lets selectSubcategorySuggestion (below) search immediately
// with a subcategory + keyword it just picked, without waiting on the
// setSearchTerm/setSubcategoryId state updates to land first.
const handleSearch = (overrides?: { subcategoryId?: string; keyword?: string; categoryId?: string }) => {

  const params = new URLSearchParams();

  const keyword = overrides?.keyword ?? searchTerm;

  if (keyword.trim()) {
    params.set("keyword", keyword.trim());
  }

  const effectiveCategoryId = overrides?.categoryId ?? categoryId;

  if (effectiveCategoryId) {
    params.set("categoryId", effectiveCategoryId);
  }

  const effectiveSubcategoryId = overrides?.subcategoryId ?? subcategoryId;

  if (effectiveSubcategoryId) {
    params.set("subcategoryId", effectiveSubcategoryId);
  }

  // Scope results to the customer's own area when we've managed to
  // resolve their detected/saved location against the catalog - see
  // the resolveLocation useEffect above. Falls back to unfiltered
  // (every location) when it hasn't resolved yet or nothing matched.
  if (resolvedLocation.stateId) {
    params.set("state", String(resolvedLocation.stateId));
  }

  if (resolvedLocation.districtId) {
    params.set("district", String(resolvedLocation.districtId));
  }

  router.push(`/search?${params.toString()}`);

};

// Subcategories to suggest from, filtered by whatever's typed so far
// (prefix matches first, then substring), capped so the dropdown stays
// short. Once a category's picked, this suggests only from its own
// subcategories and - with nothing typed yet - just lists all of them,
// so the dropdown still doubles as a browse list right after picking a
// category. With "All Categories" still selected there's no per-category
// list to fall back on, so it searches across every subcategory instead
// (allSubcategories, loaded once on mount) once the user starts typing.
const subcategorySuggestions = React.useMemo(() => {
  const pool = categoryId ? subcategories : allSubcategories;
  if (pool.length === 0) return [];

  const term = searchTerm.trim().toLowerCase();

  if (!term) {
    // Only double as a full browse list once a category narrows the
    // pool down to a manageable size - across every category this
    // would just be hundreds of unrelated subcategories.
    return categoryId ? pool.slice(0, 8) : [];
  }

  const starts = pool.filter((s) =>
    s.name.toLowerCase().startsWith(term)
  );
  const contains = pool.filter(
    (s) =>
      !s.name.toLowerCase().startsWith(term) &&
      s.name.toLowerCase().includes(term)
  );

  return [...starts, ...contains].slice(0, 8);
}, [categoryId, subcategories, allSubcategories, searchTerm]);

const selectSubcategorySuggestion = (s: Subcategory) => {
  setSearchTerm(s.name);
  setCategoryId(s.category_id);
  setSubcategoryId(s.id);
  setShowSubcategorySuggestions(false);

  // Search by subcategoryId alone, not also as a keyword: the backend
  // ANDs keyword text-search with subcategoryId, and providers rarely
  // have the subcategory's own name in their title/description, so
  // passing both here previously produced false "0 results" every
  // time a suggestion was picked. The subcategory name still shows in
  // the search box for context - it's just not sent as a filter.
  // categoryId is passed as an override too (rather than relying on
  // the setCategoryId call above) since that state update won't have
  // landed yet when handleSearch reads it synchronously right after.
  handleSearch({
    subcategoryId: s.id,
    keyword: "",
    categoryId: s.category_id
  });
};

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#F8F6F2] shadow-sm border-b border-[#E5E7EB] pr-6">
      <div className="h-[72px] px-3 md:px-6 flex items-center text-[#1F2937]">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <Link href="/">
            <img
                src="/AppLogo%201.png"
                alt="OccasionX"
                className="h-12 md:h-14 select-none"
            />
          </Link>
        </div>

        {/* Middle-left: Location selector */}
        <div className="hidden sm:flex items-center gap-2 ml-4 md:ml-6">
          <div>
            <IconMapPin className="text-[#1E3A8A]" width={16} height={16} />
          </div>
          <div className="leading-tight">
            <div className="text-xs md:text-sm font-medium">
              
              {detectedLocation.city
                ? `${
                    detectedLocation.district ||
                    detectedLocation.city
                  }, ${detectedLocation.state}`
                : "Detecting location..."}

            </div>
            
            <button
              type="button"
              className="text-[11px] md:text-xs text-[#1E3A8A] hover:text-[#1F2937] underline font-medium transition"
              onClick={() => setShowLocationModal(true)}
            >
              Update location
            </button>

          </div>
        </div>

        {/* Center: Search bar */}
        <div className="flex-1 flex items-center justify-start px-2 md:px-6">
          {/* search bar (compact) */}
          <div className="w-full max-w-lg ml-2 md:ml-4" ref={searchBoxRef}>
            <div className="flex items-stretch">
              {/* Left: Category */}
              <div className="hidden sm:flex items-center bg-white text-[#1F2937] rounded-l-md px-3 border border-[#E5E7EB]">
                <select
                  className="bg-transparent outline-none text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Middle + Right: Input, button and its suggestions
                  dropdown all share this positioning context, so the
                  dropdown aligns under the search input itself
                  instead of stretching back to the Category select's
                  left edge (which is what "relative" on the whole
                  bar - category included - used to produce). */}
              <div className="relative flex-1 flex items-stretch">
                <input
                  className="flex-1 h-10 md:h-11 bg-white text-black placeholder-gray-500 px-3 outline-none"
                  placeholder="Search OccasionX services"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowSubcategorySuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowSubcategorySuggestions(false);
                      handleSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSubcategorySuggestions(false);
                    handleSearch();
                  }}
                  className="h-10 md:h-11 w-12 md:w-14 rounded-r-md bg-[#1E3A8A] hover:bg-[#182E6E] text-white flex items-center justify-center"
                  aria-label="Search"
                >
                  <IconSearch width={18} height={18} />
                </button>

                {/* Subcategory suggestions - shown once a category is
                    picked, in place of the old dedicated second search
                    box. */}
                {showSubcategorySuggestions && subcategorySuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-md border border-[#E5E7EB] bg-white shadow-lg z-10 overflow-hidden">
                    {subcategorySuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectSubcategorySuggestion(s)}
                        className="w-full text-left px-3 py-2 text-sm text-[#1F2937] hover:bg-[#F8F6F2]"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-5 shrink-0 pr-2 md:pr-0">

          {/* ACCOUNT DROPDOWN */}
<div className="relative hidden md:block group">
  
  {/* Trigger */}
  <div className="px-2 py-1 rounded cursor-pointer border border-transparent hover:border-[#C8B8A6] transition">
    
    <p className="text-xs text-[#1E3A8A] leading-tight">
        {user
          ? `Hello, ${(user.fullName || user.name || "User").split(" ")[0]}`
          : "Hello, sign in"}
    </p>

    <div className="flex items-center gap-1">
      <span className="text-sm font-semibold text-[#1F2937]">
        Account & Lists
      </span>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-3 h-3 mt-[1px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  </div>

 {/* DROPDOWN */}
<div className="absolute right-0 top-full mt-0 w-[320px] bg-white border border-gray-200 rounded-md shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">

  {/* Hover Buffer */}
  <div className="absolute right-0 -top-3 h-3 w-full"></div>

  {/* TOP AUTH SECTION */}
  {!user && (
    <div className="border-b px-6 py-4 flex flex-col items-center">

      <Link
        href="/signin"
        className="bg-[#1E3A8A] hover:bg-[#182E6E] text-white text-sm font-medium px-16 py-2 rounded-md transition"
      >
        Sign In
      </Link>

      <p className="text-xs mt-2 text-gray-600">
        New to OX?{" "}
        <Link
          href="/register"
          className="text-[#1E3A8A] hover:underline font-medium"
        >
          Start here
        </Link>
      </p>

      <div className="w-full mt-3 pt-3 border-t flex items-center justify-center">
        <Link
          href="/provider/login"
          className="text-xs text-[#1E3A8A] hover:underline font-medium"
        >
          Are you a service provider? Provider Login
        </Link>
      </div>
    </div>
  )}

  {/* ACCOUNT SECTION */}
  <div className="px-6 py-5">

    <h4 className="font-bold text-sm mb-3 text-[#1F2937]">
      Your Account
    </h4>

    <div className="flex flex-col text-sm text-gray-700">

      <Link
        href="/profile"
        className="py-1 hover:text-[#1E3A8A]"
      >
        Your Profile
      </Link>

      <Link
        href="/my-bookings"
        className="py-1 hover:text-[#1E3A8A]"
      >
        Your Orders
      </Link>

      {user && (
        <Link
          href="/provider/register"
          className="py-1 hover:text-[#1E3A8A]"
        >
          Become a Partner
        </Link>
      )}

      {user && (
          <button
            onClick={() =>
              router.push(
                getDashboardRoute(
                  user.role
                )
              )
            }
            className="
              text-left
              py-1
              hover:text-[#1E3A8A]
            "
          >
            {user.role === "ADMIN"
              ? "Admin Dashboard"
              : user.role === "PROVIDER"
              ? "Provider Dashboard"
              : "Dashboard"}
          </button>
        )}
      <Link
        href="/help"
        className="py-1 hover:text-[#1E3A8A]"
      >
        Support Center
      </Link>

      <Link
        href="/settings"
        className="py-1 hover:text-[#1E3A8A]"
      >
        Account Settings
      </Link>

      {user && (
        <button
        onClick={handleLogout}
        className="text-left py-1 hover:text-red-500"
      >
        Logout
      </button>
            )}
          </div>
        </div>
      </div>
      </div>
          <Link
            href="/wishlist"
            className="relative transition transform hover:opacity-80 hover:scale-105"
            aria-label="Wishlist"
          >
            <IconHeart width={20} height={20} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full px-1">
                {wishlistCount > 9 ? "9+" : wishlistCount}
              </span>
            )}
          </Link>
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative transition transform hover:opacity-80 hover:scale-105"
              aria-label="Notifications"
            >
              <IconBell width={20} height={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[420px] overflow-y-auto bg-white border border-gray-200 rounded-md shadow-2xl z-50">
                <div className="px-4 py-3 border-b font-semibold text-sm text-[#1F2937]">
                  Notifications
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b last:border-b-0 text-sm ${
                        n.is_read ? "bg-white" : "bg-[#F8F6F2]"
                      }`}
                    >
                      <p className="font-medium text-[#1F2937]">
                        {n.title}
                      </p>

                      {n.message && (
                        <p className="text-gray-600 mt-1">
                          {n.message}
                        </p>
                      )}

                      <p className="text-[11px] text-gray-400 mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <Link
            href="/cart"
            className="relative transition transform hover:opacity-80 hover:scale-105"
            aria-label="Cart"
          >
            <IconCart width={20} height={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-green-500 text-white text-[10px] rounded-full px-1">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Location Modal (simple placeholder) */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-[#263954] text-white rounded-xl p-4 w-[90%] max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Update location</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                className="rounded bg-white/10 px-3 py-2"
                placeholder="City"
                value={location.city}
                onChange={(e) => setLocation({ ...location, city: e.target.value })}
              />
              <input
                className="rounded bg-white/10 px-3 py-2"
                placeholder="Pincode"
                value={location.pincode}
                onChange={(e) => setLocation({ ...location, pincode: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 bg-white/20 rounded" onClick={() => setShowLocationModal(false)}>Close</button>
              
              <button
                className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#182E6E] text-white rounded disabled:opacity-50"
                disabled={savingLocation}
                onClick={() => void handleSaveLocation()}
              >
                {savingLocation ? "Saving..." : "Save"}
              </button>

            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
