"use client";
import { Suspense } from "react";
import { API_GATEWAY_URL } from "@/lib/apiClient";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProviderSidebar from "@/components/provider-onboarding/ProviderSidebar";
import { ProviderDashboard } from "@/types/provider";
import BusinessProfileSection from "@/components/provider-onboarding/BusinessProfileSection";
import DocumentsSection from "@/components/provider-onboarding/DocumentsSection";
import PortfolioSection from "@/components/provider-onboarding/PortfolioSection";
import ServicesSection from "@/components/provider-onboarding/ServicesSection";
import SubscriptionSection from "@/components/provider-onboarding/SubscriptionSection";
import { useSearchParams } from "next/navigation";

function ProviderSetupPageContent() {
  const [active, setActive] = useState("profile");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [provider, setProvider] =
  useState<ProviderDashboard | null>(
    null
  );
  
  useEffect(() => {
  const loadProviderStatus = async () => {

    try {

      const providerId =
        localStorage.getItem(
          "provider_id"
        );

      if (!providerId) return;

      const res = await fetch(
        `${API_GATEWAY_URL}/providers/dashboard/${providerId}`
      );

      const provider =
        await res.json();

      setProvider(provider);

      const tab =
        searchParams.get("tab");

      if (tab) {
        // Pricing is now managed inline on the Services tab rather
        // than as its own step - redirect any old bookmarks/links.
        setActive(tab === "pricing" ? "services" : tab);
        return;
      }

      if (provider.onboarding_completed) {
        setActive("profile");
        return;
      }

      if (!provider.documents_uploaded) {
        setActive("documents");
        return;
      }

      if (provider.portfolio_count === 0) {
        setActive("portfolio");
        return;
      }

      if (provider.services_count === 0) {
        setActive("services");
        return;
      }

      if (!provider.pricing_completed) {
        setActive("services");
        return;
      }

      if (
        !provider.registration_fee_paid ||
        !provider.account_activated
      ) {
        setActive("subscription");
        return;
      }

      setActive("profile");

    } catch (error) {
      console.error(error);
    }
  };

  void loadProviderStatus();

}, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F8F6F2]">

      <div className="max-w-7xl mx-auto flex">

        <ProviderSidebar
          active={active}
          setActive={setActive}
        />

        <div className="flex-1 p-8">

          {active === "profile" && (
            <BusinessProfileSection />
          )}

          {active === "documents" && (
            <DocumentsSection />
          )}

          {active === "portfolio" && (
            <PortfolioSection />
          )}

          {active === "services" && (
            <ServicesSection />
          )}

          {active === "subscription" && (

          provider?.registration_fee_paid &&
          provider?.account_activated ? (

            <div
              className="
                bg-white
                rounded-3xl
                shadow
                p-12
                text-center
              "
            >

              <div className="text-7xl">
                🎉
              </div>

              <h1
                className="
                  text-3xl
                  font-bold
                  text-[#16A34A]
                  mt-4
                "
              >
                Registration Complete
              </h1>

              <p
                className="
                  mt-3
                  text-[#1F2937]
                "
              >
                Your provider account is active
                and ready to receive bookings.
              </p>

              {provider.registration_paid_at && (

                <p
                  className="
                    mt-4
                    text-sm
                    text-[#1F2937]/70
                  "
                >
                  Payment received on{" "}
                  {new Date(
                    provider.registration_paid_at
                  ).toLocaleDateString()}
                </p>

              )}

              <button
                onClick={() =>
                  router.push(
                    "/provider/dashboard"
                  )
                }
                className="
                  mt-8
                  bg-[#1E3A8A]
                  hover:bg-[#182E6E]
                  text-white
                  px-8
                  py-4
                  rounded-xl
                  font-semibold
                  transition
                "
              >
                Go To Dashboard
              </button>

            </div>

          ) : provider?.registration_fee_paid &&
            !provider?.account_activated ? (

            <div
              className="
                bg-white
                rounded-3xl
                shadow
                p-12
                text-center
              "
            >

              <div className="text-7xl">
                📧
              </div>

              <h1
                className="
                  text-3xl
                  font-bold
                  text-[#1F2937]
                  mt-4
                "
              >
                Almost there!
              </h1>

              <p
                className="
                  mt-3
                  text-gray-600
                  max-w-md
                  mx-auto
                "
              >
                Your registration fee payment is complete. We&apos;ve
                sent an activation link to your email - please open
                it to activate your provider account. You&apos;ll
                need to activate before you can log in and receive
                bookings.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/provider/login"
                  )
                }
                className="
                  mt-8
                  bg-[#1E3A8A]
                  hover:bg-[#182E6E]
                  text-white
                  px-8
                  py-4
                  rounded-xl
                  font-semibold
                "
              >
                Go to Provider Login
              </button>

            </div>

          ) : (

            <SubscriptionSection />

          )

        )}

        </div>

      </div>

    </div>
  );
}

// useSearchParams() needs a Suspense boundary for `next build` to
// prerender this page.
export default function ProviderSetupPage() {
  return (
    <Suspense fallback={null}>
      <ProviderSetupPageContent />
    </Suspense>
  );
}
