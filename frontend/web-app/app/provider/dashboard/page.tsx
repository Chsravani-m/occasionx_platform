"use client";
import { API_GATEWAY_URL } from "@/lib/apiClient";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  ProviderDashboard as ProviderDashboardType
} from "@/types/provider";
import { useToast } from "@/context/NotificationContext";
import {
  uploadDisplayPicture,
  uploadCoverImage,
} from "@/services/providerProfileApi";
import { getProviderServices } from "@/services/providerServiceApi";
import { getCategories } from "@/services/catalogApi";
import { getServiceAttributeSchema } from "@/utils/serviceAttributesSchema";

const PROVIDER_MEDIA_BASE = API_GATEWAY_URL;

const SIDEBAR_ITEMS = [
  {
    key: "services",
    label: "Services",
    icon: "🛠️",
    href: "/provider/setup?tab=services",
  },
  {
    key: "documents",
    label: "Documents",
    icon: "📄",
    href: "/provider/setup?tab=documents",
  },
  {
    key: "portfolio",
    label: "Portfolio",
    icon: "📸",
    href: "/provider/setup?tab=portfolio",
  },
];

export default function ProviderDashboard() {

  const router = useRouter();
  const toast = useToast();

  const [provider, setProvider] =
    useState<ProviderDashboardType | null>(
      null
    );

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [uploadingCover, setUploadingCover] =
    useState(false);

  const handlePhotoSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const providerId = localStorage.getItem("provider_id");
    if (!providerId) return;

    try {
      setUploadingPhoto(true);

      const result = await uploadDisplayPicture(
        providerId,
        file
      );

      setProvider((prev) =>
        prev
          ? {
              ...prev,
              display_picture_url:
                result.display_picture_url ?? null
            }
          : prev
      );

      toast.success("Display picture updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload display picture");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleCoverSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const providerId = localStorage.getItem("provider_id");
    if (!providerId) return;

    try {
      setUploadingCover(true);

      const result = await uploadCoverImage(
        providerId,
        file
      );

      setProvider((prev) =>
        prev
          ? {
              ...prev,
              cover_image_url:
                result.cover_image_url ?? null
            }
          : prev
      );

      toast.success("Cover photo updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload cover photo");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  // Specifications (category-specific attribute fields, filled in from
  // the Services tab's "Specifications" button on each service) are
  // deliberately NOT part of the registration wizard, so a freshly
  // registered provider - who has only ever supplied registration-time
  // info - should not read as 100% complete. This is computed
  // separately from the /providers/dashboard/{id} payload because it
  // needs each service's category name (from catalog-service) joined
  // against its attributes (from provider-service), the same
  // client-side join ServicesSection.tsx already does.
  const [specificationsCompleted, setSpecificationsCompleted] =
    useState(false);

  const calculateCompletion = () => {
  if (!provider) return 0;

  let completed = 0;

  if ((provider.documents_uploaded ?? 0) > 0)
    completed++;

  if ((provider.services_count ?? 0) > 0)
    completed++;

  if ((provider.portfolio_count ?? 0) > 0)
    completed++;

  if (provider.pricing_completed)
    completed++;

  if (provider.registration_fee_paid)
    completed++;

  if (specificationsCompleted)
    completed++;

  return Math.round((completed / 6) * 100);
};

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
  async function loadSpecificationsStatus(providerId: string) {
    try {
      const [services, categories] = await Promise.all([
        getProviderServices(providerId),
        getCategories(),
      ]);

      const categoryNameFor = (categoryId?: string): string =>
        categories.find((c) => c.id === categoryId)?.name ?? "";

      const servicesRequiringSpecs = (services as {
        category_id?: string;
        attributes?: Record<string, unknown>;
      }[]).filter((s) =>
        getServiceAttributeSchema(categoryNameFor(s.category_id))
      );

      const allFilled =
        services.length > 0 &&
        servicesRequiringSpecs.every(
          (s) => s.attributes && Object.keys(s.attributes).length > 0
        );

      setSpecificationsCompleted(allFilled);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadProvider() {


    try {
      const providerId =
        localStorage.getItem("provider_id");

      if (!providerId) {
        router.push("/provider/login");
        return;
      }

      const res = await fetch(
        `${API_GATEWAY_URL}/providers/dashboard/${providerId}`
      );

      const dashboard =
        await res.json();

      console.log(
        "DASHBOARD DATA",
        dashboard
      );

      if (!dashboard.onboarding_completed) {

        if (!dashboard.documents_uploaded) {
          router.push(
            "/provider/setup?tab=documents"
          );
          return;
        }

        if (
          dashboard.portfolio_count === 0
        ) {
          router.push(
            "/provider/setup?tab=portfolio"
          );
          return;
        }

        if (
          dashboard.services_count === 0
        ) {
          router.push(
            "/provider/setup?tab=services"
          );
          return;
        }

        if (
          !dashboard.pricing_completed
        ) {
          router.push(
            "/provider/setup?tab=services"
          );
          return;
        }

        if (
          !dashboard.registration_fee_paid
        ) {
          router.push(
            "/provider/setup?tab=subscription"
          );
          return;
        }
      }

      setProvider(dashboard);

      void loadSpecificationsStatus(providerId);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  loadProvider();
}, [router]);

const sidebarValue = (key: string) => {
  if (!provider) return "…";

  if (key === "services") return provider.services_count ?? 0;
  if (key === "documents") return provider.documents_uploaded ?? 0;
  if (key === "portfolio") return provider.portfolio_count ?? 0;

  return 0;
};

if (loading) {
  return (
    <div
      className="
        min-h-screen
        flex
        items-center
        justify-center
      "
    >
      <div className="text-center">

        <div
          className="
            w-12
            h-12
            border-4
            border-[#1E3A8A]
            border-t-transparent
            rounded-full
            animate-spin
            mx-auto
          "
        />

        <p className="mt-4 text-gray-500">
          Loading Dashboard...
        </p>

      </div>
    </div>
  );
}

  return (

    <div className="min-h-screen bg-[#F8F6F2] flex">

      {/* Left Sidebar */}

      <aside
        className="
          hidden
          lg:flex
          lg:flex-col
          w-72
          bg-white
          border-r
          border-[#E5E7EB]
          min-h-screen
          sticky
          top-0
          p-6
        "
      >

        <h2 className="font-bold text-lg text-[#1F2937] mb-1">
          Business Setup
        </h2>

        <p className="text-sm text-gray-500 mb-6">
          Keep every section up to date.
        </p>

        <nav className="space-y-2">

          {SIDEBAR_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="
                flex
                items-center
                justify-between
                gap-3
                rounded-xl
                px-4
                py-3
                text-[#1F2937]
                transition
                hover:bg-[#F8F6F2]
              "
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </span>

              <span
                className="
                  min-w-[2rem]
                  text-center
                  rounded-full
                  bg-[#1E3A8A]/10
                  px-2.5
                  py-1
                  text-xs
                  font-semibold
                  text-[#1E3A8A]
                "
              >
                {sidebarValue(item.key)}
              </span>
            </Link>
          ))}

        </nav>

      </aside>

      {/* Main Content */}

      <div className="flex-1 p-8">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl font-bold text-[#1F2937]">
          Provider Dashboard
        </h1>

          <p className="text-gray-600 mt-2">
            Keep your profile updated to receive more event bookings.
          </p>


        {/* Provider Card */}

        <div
        className={`
          relative
          rounded-3xl
          overflow-hidden
          p-8
          text-white
          mt-8
          bg-gradient-to-r
          from-[#1E3A8A]
          to-[#18285A]
          ${provider?.cover_image_url ? "bg-cover bg-center" : ""}
        `}
        style={
          provider?.cover_image_url
            ? {
                backgroundImage: `linear-gradient(to right, rgba(30,58,138,0.75), rgba(24,40,90,0.75)), url(${PROVIDER_MEDIA_BASE}${provider.cover_image_url})`,
              }
            : undefined
        }
      >

        <label
          className="
            absolute
            bottom-4
            right-4
            z-10
            cursor-pointer
            bg-white/90
            hover:bg-white
            text-[#1E3A8A]
            font-medium
            text-xs
            rounded-lg
            px-3 py-1.5
          "
        >
          {uploadingCover ? "Uploading..." : "Change Cover"}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleCoverSelected}
            disabled={uploadingCover}
            className="hidden"
          />
        </label>

        <div className="relative">

      <div className="flex justify-between items-start">

        <div className="flex items-start gap-5">

          <label
            className="
              relative
              w-20 h-20
              rounded-full
              overflow-hidden
              bg-white/10
              border-2
              border-white/40
              flex-shrink-0
              flex items-center justify-center
              cursor-pointer
              group
            "
          >
            {provider?.display_picture_url ? (
              <img
                src={`${PROVIDER_MEDIA_BASE}${provider.display_picture_url}`}
                alt="Display picture"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl">🏢</span>
            )}

            <div
              className="
                absolute inset-0
                bg-black/50
                opacity-0
                group-hover:opacity-100
                flex items-center justify-center
                text-[11px]
                font-medium
                text-center
                transition-opacity
              "
            >
              {uploadingPhoto ? "Uploading..." : "Change Photo"}
            </div>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handlePhotoSelected}
              disabled={uploadingPhoto}
              className="hidden"
            />
          </label>

          <div>

          <h2 className="text-3xl font-bold">
            {provider?.business_name}
          </h2>

          <p className="mt-2 text-white/80">
            {provider?.owner_name}
          </p>

          <p className="text-white/70">
            {provider?.email}
          </p>

          <p className="text-white/70">
            {provider?.phone}
          </p>

          </div>

        </div>

        <div>

      <span
        className={`
          px-4 py-2 rounded-full text-sm font-medium
          ${
            provider?.verification_status === "VERIFIED"
              ? "bg-green-500"
              : provider?.verification_status === "REJECTED"
              ? "bg-red-500"
              : "bg-yellow-500 text-black"
          }
        `}
      >
        {provider?.verification_status}
      </span>

    </div>

  </div>

  <div className="mt-8">

    <div className="flex justify-between">

      <span>
        Profile Completion
      </span>

      <span>
        {calculateCompletion()}%
      </span>

    </div>

    <div className="mt-2 h-3 bg-white/20 rounded-full">

      <div
        className="h-3 bg-white rounded-full"
        style={{
          width: `${calculateCompletion()}%`
        }}
      />

    </div>

  </div>

  </div>

</div>

        {/* Quick Actions */}

                <h2
          className="
            text-2xl
            font-semibold
            mt-10
            mb-5
            text-[#1F2937]
          "
        >
          Quick Actions
        </h2>

        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">

          <Link
            href="/provider/bookings"
            className="
              bg-white
              rounded-3xl
              p-6
              border
              shadow-sm
              hover:shadow-xl
              transition-all
            "
          >

            <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A]/10 flex items-center justify-center text-2xl">
              📅
            </div>

            <h3 className="mt-4 font-semibold">
              Bookings
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Manage customer bookings
            </p>

          </Link>

          <Link
            href="/provider/blocked_dates"
            className="
              bg-white
              rounded-3xl
              p-6
              border
              shadow-sm
              hover:shadow-xl
              transition-all
            "
          >
            <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A]/10 flex items-center justify-center text-2xl">
              🗓
            </div>

            <h3 className="mt-4 font-semibold">
              Availability
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Manage your availability
            </p>

          </Link>

          <Link
            href="/provider/bank-details"
            className="
              bg-white
              rounded-3xl
              p-6
              border
              shadow-sm
              hover:shadow-xl
              transition-all
            "
          >

            <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A]/10 flex items-center justify-center text-2xl">
              🏦
            </div>

            <h3 className="mt-4 font-semibold">
              Bank Details
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Add your account for booking payouts
            </p>

          </Link>

          <Link
            href="/provider/booking-policy"
            className="
              bg-white
              rounded-3xl
              p-6
              border
              shadow-sm
              hover:shadow-xl
              transition-all
            "
          >

            <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A]/10 flex items-center justify-center text-2xl">
              📋
            </div>

            <h3 className="mt-4 font-semibold">
              Booking Policy
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Set your notice period + cancellation terms
            </p>

          </Link>

          <Link
            href="/provider/earnings"
            className="
              bg-white
              rounded-3xl
              p-6
              border
              shadow-sm
              hover:shadow-xl
              transition-all
            "
          >

            <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A]/10 flex items-center justify-center text-2xl">
              💰
            </div>

            <h3 className="mt-4 font-semibold">
              Earnings
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              View your booking revenue
            </p>

          </Link>

          <Link
            href="/provider/setup?tab=profile"
            className="
              bg-white
              rounded-3xl
              p-6
              border
              shadow-sm
              hover:shadow-xl
              transition-all
            "
          >

            <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A]/10 flex items-center justify-center text-2xl">
              🏢
            </div>

            <h3 className="mt-4 font-semibold">
              Business Profile
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Update business information
            </p>

          </Link>

          <Link
            href="/provider/reviews"
            className="
              bg-white
              rounded-3xl
              p-6
              border
              shadow-sm
              hover:shadow-xl
              transition-all
            "
          >

            <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A]/10 flex items-center justify-center text-2xl">
              ⭐
            </div>

            <h3 className="mt-4 font-semibold">
              Reviews
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              See what customers are saying
            </p>

          </Link>
          </div>

        <div
          className="
            bg-white
            rounded-3xl
            p-8
            shadow-sm
            mt-8
          "
        >

          <h2 className="text-xl font-semibold text-[#1F2937]">
            Business Health
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mt-6">

            <div>
              <p className="text-gray-500">
                Verification
              </p>

              <h3 className="font-semibold mt-1">
                {provider?.verification_status}
              </h3>
            </div>

            <div>
              <p className="text-gray-500">
                Profile Completion
              </p>

              <h3 className="font-semibold mt-1">
                {calculateCompletion()}%
              </h3>
            </div>

            <div>
              <p className="text-gray-500">
                Subscription
              </p>

              <h3 className="font-semibold mt-1">
                {provider?.registration_fee_paid
                  ? "Active"
                  : "Pending"}
              </h3>
            </div>

          </div>

  </div>
</div>
</div>
</div>
  );
}
