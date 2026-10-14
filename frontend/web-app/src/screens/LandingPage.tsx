"use client";

// Copilot: Implement the Hero section + Quick Search UI for the OccasionXplore
// landing page in React + TypeScript with TailwindCSS + glassmorphism.
//
// Context:
// - We are using React Router v6.
// - This code will live in src/pages/LandingPage.tsx.
// - When the user clicks the Search button, we should validate required fields
//   and then navigate to /search with query parameters.
//
// Requirements:
//
// 1) Component:
//    - Create a functional component: `LandingPage`.
//    - Import and use `useNavigate` from react-router-dom.
//    - Use local state hooks (useState) to manage:
//        state, district, location, categoryId, subcategoryId, keyword.
//    - Define a `handleSearch` function:
//        * Prevent default form submit
//        * Validate that state, district, and categoryId are filled
//        * If missing, show a simple alert for now
//        * If valid, build a URLSearchParams object and navigate to
//          `/search?state=...&district=...&location=...&categoryId=...&subcategoryId=...&keyword=...`
//
// 2) Hero Layout:
//    - Wrap hero section in a div with className "ox-hero" (we have CSS for this).
//    - Add:
//        Headline: "Plan Your Perfect Event"
//        Subtitle: "Discover venues, catering, décor, photography and more – all in one place."
//    - Overlay a background gradient (via existing CSS classes) and center content.
//
// 3) Quick Search Card (Glassmorphism):
//    - Use a <form> with className "ox-search-card".
//    - Use two rows (flex or grid):
//       Row 1:
//         * State (select, required)
//         * District (select, required)
//         * Location (text input)
//       Row 2:
//         * Category (select, required)
//         * Sub-Category (select)
//         * Keyword (text input)
//    - Each field uses a wrapper with className "ox-field" and label above the input.
//    - At the bottom, add a button row:
//         <button type="submit" className="ox-search-btn">Search</button>
//    - Below the button, show microcopy:
//         "* State, District and Category are mandatory for search."
//
// 4) Field options (hard-coded for now):
//    - State options: Telangana, Andhra Pradesh, Karnataka.
//    - District options: Hyderabad, Ranga Reddy, Medchal.
//    - Category options:
//        (value = ID to be used as categoryId)
//
//        1 - Venues
//        2 - Catering
//        3 - Photography
//        4 - Decor & Flowers
//        5 - Purohits & Rituals
//        6 - Entertainment
//
//    - Sub-Category options can be simple placeholders depending on categoryId:
//        If Venues: Banquet Hall, Function Hall, Lawn
//        If Catering: Veg Catering, Non-Veg Catering
//        etc. For now, it's okay to keep one static list or conditional logic.
//
// 5) Styling assumptions:
//    - Use classNames that are already defined (or will be defined) in index.css:
//        ox-hero, ox-hero-overlay, ox-hero-content,
//        ox-search-card, ox-row, ox-field,
//        ox-actions, ox-search-btn, ox-note.
//    - Use a responsive layout: on small screens the fields stack; on larger screens
//      show them as 3 columns per row.
//
// 6) Export:
//    - Export LandingPage as the default component.
//    - Do not modify routing here; assume App.tsx has <Route path="/" element={<LandingPage />} />.





// Copilot: Implement the Hero section + Quick Search UI for the OccasionXplore
// landing page in React + TypeScript with TailwindCSS + glassmorphism.
//
// Context:
// - We are using React Router v6.
// - This code will live in src/pages/LandingPage.tsx.
// - When the user clicks the Search button, we should validate required fields
//   and then navigate to /search with query parameters.
//
// Requirements:
//
// 1) Component:
//    - Create a functional component: `LandingPage`.
//    - Import and use `useNavigate` from react-router-dom.
//    - Use local state hooks (useState) to manage:
//        state, district, location, categoryId, subcategoryId, keyword.
//    - Define a `handleSearch` function:
//        * Prevent default form submit
//        * Validate that state, district, and categoryId are filled
//        * If missing, show a simple alert for now
//        * If valid, build a URLSearchParams object and navigate to
//          `/search?state=...&district=...&location=...&categoryId=...&subcategoryId=...&keyword=...`
//
// 2) Hero Layout:
//    - Wrap hero section in a div with className "ox-hero" (we have CSS for this).
//    - Add:
//        Headline: "Plan Your Perfect Event"
//        Subtitle: "Discover venues, catering, décor, photography and more – all in one place."
//    - Overlay a background gradient (via existing CSS classes) and center content.
//
// 3) Quick Search Card (Glassmorphism):
//    - Use a <form> with className "ox-search-card".
//    - Use two rows (flex or grid):
//       Row 1:
//         * State (select, required)
//         * District (select, required)
//         * Location (text input)
//       Row 2:
//         * Category (select, required)
//         * Sub-Category (select)
//         * Keyword (text input)
//    - Each field uses a wrapper with className "ox-field" and label above the input.
//    - At the bottom, add a button row:
//         <button type="submit" className="ox-search-btn">Search</button>
//    - Below the button, show microcopy:
//         "* State, District and Category are mandatory for search."
//
// 4) Field options (hard-coded for now):
//    - State options: Telangana, Andhra Pradesh, Karnataka.
//    - District options: Hyderabad, Ranga Reddy, Medchal.
//    - Category options:
//        (value = ID to be used as categoryId)
//
//        1 - Venues
//        2 - Catering
//        3 - Photography
//        4 - Decor & Flowers
//        5 - Purohits & Rituals
//        6 - Entertainment
//
//    - Sub-Category options can be simple placeholders depending on categoryId:
//        If Venues: Banquet Hall, Function Hall, Lawn
//        If Catering: Veg Catering, Non-Veg Catering
//        etc. For now, it's okay to keep one static list or conditional logic.
//
// 5) Styling assumptions:
//    - Use classNames that are already defined (or will be defined) in index.css:
//        ox-hero, ox-hero-overlay, ox-hero-content,
//        ox-search-card, ox-row, ox-field,
//        ox-actions, ox-search-btn, ox-note.
//    - Use a responsive layout: on small screens the fields stack; on larger screens
//      show them as 3 columns per row.
//
// 6) Export:
//    - Export LandingPage as the default component.
//    - Do not modify routing here; assume App.tsx has <Route path="/" element={<LandingPage />} />.
//
// Generate the full LandingPage component code now, including the hero + quick search form,
// with proper TypeScript types, imports, and useNavigate navigation.
// How to use it
//
// Open src/pages/LandingPage.tsx
//
// Paste the prompt as a comment at the top.
//
// Below it, type: const LandingPage = () => {

import React, { useState, useEffect } from 'react';
import { useToast, useConfirm } from "@/context/NotificationContext";
import { PopularSearchCategories } from "../components/home/PopularCategories";
import { PackagesSection } from "../components/home/PackagesSection";
import { OffersSection } from "../components/home/OffersSection";
import { HowItWorksSection } from "../components/home/HowItWorks";
import Footer from "../components/layout/Footer";
import { useRouter } from "next/navigation";

import { FiSearch, FiMapPin, FiChevronDown } from 'react-icons/fi';
import { getStates, getDistricts, getLocations} from "../services/locationApi";
import {
  APPROXIMATE_ACCURACY_METERS,
  districtCandidates,
  getCurrentPosition,
  localityCandidates,
  matchByName,
  reverseGeocode,
  saveLocation,
} from "../utils/locationMatch";
import {
  getCategories,
  getSubcategories
} from "../services/catalogApi";

interface StateDto {
      id: number;
      name: string;
    }

interface DistrictDto {
      id: number;
      name: string;
    }
interface LocationDto {
  id: number;
  name: string;
}
interface CategoryDto {
      id: string;
      name: string;
    }

interface SubCategoryDto {
      id: string;
      name: string;
    }
{/*interface LandingPageProps {
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
}*/}


const LandingPage: React.FC = () => {
  const toast = useToast();
  
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [location, setLocation] = useState('');
  const [locations, setLocations] =
  useState<LocationDto[]>([]);
  const [categories, setCategories] =
    useState<CategoryDto[]>([]);

  const [subCategories, setSubCategories] =
    useState<SubCategoryDto[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [keyword, setKeyword] = useState('');
  
  const [states, setStates] = useState<StateDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);

  const [detectedLocation, setDetectedLocation] = useState({
    city: "",
    state: "",
    district: "",
    postalCode: "",
  });
  
  const router = useRouter();

  const handleAutoDetect = async () => {
    let position: GeolocationPosition;

    try {
      position = await getCurrentPosition();
    } catch {
      toast.error(
        "Unable to access your location. Allow location for this site, or pick your State and District."
      );
      return;
    }

    try {
      const { latitude, longitude, accuracy } = position.coords;
      const address = await reverseGeocode(latitude, longitude);

      const matchedState = matchByName(states, [address.state]);

      if (!matchedState) {
        toast.error(
          `We don't serve ${address.state || "your area"} yet. Please pick a State.`
        );
        return;
      }

      setState(String(matchedState.id));
      setDistrict("");
      setLocation("");
      setLocations([]);

      const districtData = await getDistricts(matchedState.id);
      setDistricts(districtData);

      const matchedDistrict = matchByName(
        districtData,
        districtCandidates(address)
      );

      if (!matchedDistrict) {
        toast.info(
          `Found ${matchedState.name}, but not your district. Please pick it from the list.`
        );
        return;
      }

      setDistrict(String(matchedDistrict.id));

      const locationData = await getLocations(matchedDistrict.id);
      setLocations(locationData);

      const matchedLocation = matchByName(
        locationData,
        localityCandidates(address)
      );

      if (matchedLocation) {
        setLocation(String(matchedLocation.id));
      }

      // Keep the header's location in step with what was detected.
      saveLocation({
        city: matchedLocation?.name || matchedDistrict.name,
        state: matchedState.name,
        district: matchedDistrict.name,
        postalCode: address.postcode || "",
      });

      if (accuracy > APPROXIMATE_ACCURACY_METERS) {
        toast.info(
          `Your browser could only estimate your location (about ${Math.round(
            accuracy / 1000
          )} km). Please check the district is right.`
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to detect location");
    }
  };

useEffect(() => {

  const loadStates = async () => {

    try {

      const data =
        await getStates();

      setStates(data);

    } catch (error) {

      console.error(
        "Failed to load states",
        error
      );
    }
  };

  void loadStates();

}, []);


const handleStateChange = async (
  stateId: number
) => {

  setState(String(stateId));
  setDistrict("");

  try {
    const data =
  await getDistricts(stateId);

setDistricts(data);

  } catch (error) {
    console.error("Failed to load districts", error);
  }
};

const handleDistrictChange =
  async (districtId: number) => {

    console.log(
      "DISTRICT SELECTED:",
      districtId
    );
    setDistrict(
      String(districtId)
    );

    const data =
      await getLocations(
        districtId
      );
    console.log(
      "LOCATIONS LOADED:",
      data
    );
    setLocations(data);
  };

useEffect(() => {
  async function fetchCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  }

  fetchCategories();
}, []);

const handleCategoryChange = async (
  categoryId: string
) => {

  setCategoryId(categoryId);

  const data = await getSubcategories(
    categoryId
  );

  setSubCategories(data);
};

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !district || !categoryId) {
      toast.error('State, District and Category are mandatory for search.');
      return;
    }
    const params = new URLSearchParams({
      state,
      district,
      location,
      categoryId: String(categoryId),
      subcategoryId: String(subCategoryId),
      keyword,
    });
    router.push(`/search?${params.toString()}`);
  };

  
  return (
    <>
    <div>
          {/* Hero Section - full-width flat section, sits flush under
              the fixed Header/MainMenu (no extra wrapper padding here
              - AppShell's <main> already accounts for the fixed nav
              height). Hero-Sec-Bg.png is the background of just the
              left "Plan Your Perfect Event" text card, not the whole
              section. */}

  <section className="relative w-full bg-[#F8F6F2] py-20">

  <div className="max-w-7xl mx-auto px-6">

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

      {/* LEFT CONTENT - Hero-Sec-Bg.png as its background */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[420px] flex flex-col justify-center p-10">

        <img
          src="/Hero-Sec-Bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-black/35" />

        <div className="glass relative">

          <h1 className="text-4xl lg:text-4xl font-bold text-white leading-tight">
            Plan Your Perfect Event
          </h1>

          <p className="mt-5 text-lg text-white/85 leading-relaxed">
            Discover venues, catering, décor, photography and event services —
            all in one place. Compare options, review packages and book with confidence.
          </p>

          <ul className="mt-8 space-y-5 text-lg text-white/90">
            <li>✓ Find trusted venues and event professionals instantly</li>

            <li>✓ Compare pricing, packages and customer reviews</li>

            <li>✓ Book photography, catering, décor and entertainment in one place</li>

            <li>✓ Secure payments with real-time booking updates</li>
          </ul>
        </div>
      </div>

      {/* RIGHT SEARCH */}
      <div
        className="
          bg-white
          border
          border-[#E5E7EB]
          rounded-3xl
          shadow-xl
          p-8">
        <form
          className="ox-search-card"
          onSubmit={handleSearch}
        >

          {/* Header */}
          <div className="flex items-center justify-between mb-6">

            <div className="flex items-center gap-2 text-[#1F2937] text-xl font-semibold">
              <FiSearch />
              Quick Search
            </div>

            <button
              type="button"
              className="flex items-center gap-1 text-sm text-[#1E3A8A] hover:text-[#18285A]"
              onClick={handleAutoDetect}
            >
              <FiMapPin />
              Auto detect location
            </button>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

            <div>
              <label className="block text-sm mb-2">
                State*
              </label>

              <div className="relative">
                <select
                  className="
                    w-full
                    h-14
                    rounded-xl
                    border
                    border-[#E5E7EB]
                    pl-4
                    pr-10
                    bg-white
                    appearance-none
                    text-left
                  "
                  value={state}
                  onChange={(e) =>
                    handleStateChange(Number(e.target.value))
                  }
                  required
                >
                  <option value="">Select State</option>

                  {states.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>

                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">
                District*
              </label>

              <div className="relative">
                <select
                  className="
                    w-full
                    h-14
                    rounded-xl
                    border
                    border-[#E5E7EB]
                    pl-4
                    pr-10
                    bg-white
                    appearance-none
                    text-left
                  "
                  value={district}
                  onChange={(e) =>
                    handleDistrictChange(
                      Number(e.target.value)
                    )
                  }

                  required
                >
                  <option value="">Select District</option>

                  {districts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">
                Location
              </label>

              <div className="relative">
                <select
                    className="
                      w-full
                      h-14
                      rounded-xl
                      border
                      border-[#E5E7EB]
                      pl-4
                      pr-10
                      bg-white
                      appearance-none
                      text-left
                    "
                    value={location}
                    onChange={(e) =>
                      setLocation(
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Select Location
                    </option>

                    {locations.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

  <div>
    <label className="block text-sm font-medium mb-2">
      Category*
    </label>

    <div className="relative">
      <select
        className="
          w-full
          h-14
          rounded-xl
          border
          border-[#E5E7EB]
          pl-4
          pr-10
          bg-white
          appearance-none
          text-left
        "
        value={categoryId}
        onChange={(e) =>
          handleCategoryChange(e.target.value)
        }
      >
        <option value="">Select Category</option>

        {categories.map((cat) => (
          <option
            key={cat.id}
            value={cat.id}
          >
            {cat.name}
          </option>
        ))}
      </select>

      <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  </div>

  <div>
    <label className="block text-sm font-medium mb-2">
      Sub Category
    </label>

    <div className="relative">
      <select
        className="
          w-full
          h-14
          rounded-xl
          border
          border-[#E5E7EB]
          pl-4
          pr-10
          bg-white
          appearance-none
          text-left
        "
        value={subCategoryId}
        onChange={(e) =>
          setSubCategoryId(e.target.value)
        }
      >
        <option value="">
          Select Sub Category
        </option>

        {subCategories.map((sub) => (
          <option
            key={sub.id}
            value={sub.id}
          >
            {sub.name}
          </option>
        ))}
      </select>

      <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  </div>

  <div>
    <label className="block text-sm font-medium mb-2">
      Keyword
    </label>

    <input
      className="
        w-full
        h-14
        rounded-xl
        border
        border-[#E5E7EB]
        px-4
      "
      placeholder="Search vendors"
      value={keyword}
      onChange={(e) =>
        setKeyword(e.target.value)
      }
    />
  </div>

</div>

          {/* Row 3 */}
          <div className="mt-6">

  <button
    type="submit"
    className="
      w-full
      h-14
      rounded-xl
      bg-[#1E3A8A]
      hover:bg-[#182E6E]
      text-white
      font-semibold
      text-lg
      transition
    "
  >
    Search Vendors
  </button>

  <p className="mt-3 text-sm text-gray-500 text-center">
    * State, District and Category are mandatory.
  </p>

</div>
        </form>
      </div>

    </div>
  </div>
</section>

        {/* Popular Search Categories Section */}
          <PopularSearchCategories />
          <PackagesSection />
          <OffersSection />
          <HowItWorksSection />
        </div>

      <Footer />
    </>
  );
};

export default LandingPage;
