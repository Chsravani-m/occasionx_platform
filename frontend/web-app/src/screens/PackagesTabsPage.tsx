"use client";

import { useState } from "react";
import { FiGrid, FiCpu, FiSliders } from "react-icons/fi";

import { InBuiltPackagesPage } from "@/screens/InBuiltPackagesPage";
import { PackageRecommendationPage } from "@/screens/PackageRecommendationPage";
import { BuildYourPackagePage } from "@/screens/BuildYourPackagePage";

export type PackagesTab = "in-built" | "ai-custom" | "build-your-own";

interface PackagesTabsPageProps {
  defaultTab?: PackagesTab;
  initialEventTypeSlug?: string;
}

const TABS: { key: PackagesTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "in-built",
    label: "OX In-Built Packages",
    icon: <FiGrid className="text-lg" />,
  },
  {
    key: "ai-custom",
    label: "AI + Custom Packages",
    icon: <FiCpu className="text-lg" />,
  },
  {
    key: "build-your-own",
    label: "Create Your Own Package",
    icon: <FiSliders className="text-lg" />,
  },
];

export function PackagesTabsPage({
  defaultTab = "in-built",
  initialEventTypeSlug,
}: PackagesTabsPageProps) {
  const [activeTab, setActiveTab] = useState<PackagesTab>(defaultTab);

  return (
    <div className="min-h-screen bg-[#F8F6F2] pt-6">
      <div className="sticky top-[100px] z-10 border-b border-[#E5E7EB] bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap gap-2 py-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-[#1E3A8A] text-white shadow-sm"
                    : "bg-[#F2F3F8] text-[#1F2937] hover:bg-[#E5E7EB]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "in-built" && (
        <InBuiltPackagesPage
          initialEventTypeSlug={initialEventTypeSlug}
          onSwitchTab={setActiveTab}
        />
      )}

      {activeTab === "ai-custom" && <PackageRecommendationPage />}

      {activeTab === "build-your-own" && <BuildYourPackagePage />}
    </div>
  );
}
