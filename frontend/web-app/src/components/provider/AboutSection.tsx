"use client";

import {
  Building2,
  BadgeCheck,
  CalendarDays,
  MapPin,
} from "lucide-react";

interface AboutSectionProps {
  provider: {
    business_name: string;
    owner_name: string;

    description?: string;

    address?: string;

    verification_status?: string;
  };
}

export default function AboutSection({
  provider,
}: AboutSectionProps) {
  return (
    <section className="mt-10">

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">

        {/* Heading */}

        <h2 className="text-3xl font-bold text-[#1F2937] mb-8">
          About
        </h2>

        {/* Description */}

        <p className="text-gray-600 leading-8 text-[16px]">
          {provider.description ||
            "No description has been added by this provider yet."}
        </p>

        {/* Information Cards */}

        <div className="grid md:grid-cols-2 gap-5 mt-10">

          {/* Business */}

          <div className="flex gap-4 rounded-2xl bg-[#F8F6F2] p-5">

            <div className="bg-white rounded-xl p-3 h-fit">
              <Building2 className="text-[#1E3A8A]" />
            </div>

            <div>

              <h3 className="font-semibold text-lg">
                Business
              </h3>

              <p className="text-gray-500 mt-1">
                {provider.business_name}
              </p>

              <p className="text-gray-400 text-sm">
                Owned by {provider.owner_name}
              </p>

            </div>

          </div>

          {/* Verification */}

          <div className="flex gap-4 rounded-2xl bg-[#F8F6F2] p-5">

            <div className="bg-white rounded-xl p-3 h-fit">
              <BadgeCheck className="text-green-600" />
            </div>

            <div>

              <h3 className="font-semibold text-lg">
                Verification
              </h3>

              <p className="text-gray-500 mt-1">
                {provider.verification_status === "VERIFIED"
                  ? "Verified by OccasionX"
                  : "Pending Verification"}
              </p>

            </div>

          </div>

          {/* Address */}

          <div className="flex gap-4 rounded-2xl bg-[#F8F6F2] p-5">

            <div className="bg-white rounded-xl p-3 h-fit">
              <MapPin className="text-[#1E3A8A]" />
            </div>

            <div>

              <h3 className="font-semibold text-lg">
                Service Location
              </h3>

              <p className="text-gray-500 mt-1">
                {provider.address || "Address not available"}
              </p>

            </div>

          </div>

          {/* Experience */}

          <div className="flex gap-4 rounded-2xl bg-[#F8F6F2] p-5">

            <div className="bg-white rounded-xl p-3 h-fit">
              <CalendarDays className="text-[#1E3A8A]" />
            </div>

            <div>

              <h3 className="font-semibold text-lg">
                Experience
              </h3>

              <p className="text-gray-500 mt-1">
                Trusted OccasionX Partner
              </p>

              <p className="text-gray-400 text-sm">
                Serving customers across India
              </p>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}