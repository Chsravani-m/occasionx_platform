"use client";

import { ArrowRight, Camera, CircleCheck } from "lucide-react";

import { ProviderService } from "@/types/provider";

interface ServicesSectionProps {
  services: ProviderService[];
  onSelectService: (
    service: ProviderService
  ) => void;
}
export default function ServicesSection({
  services,
  onSelectService,
}: ServicesSectionProps) {
  return (
    <section className="mt-10">

      <div className="flex justify-between items-center mb-8">

        <div>

          <h2 className="text-3xl font-bold text-[#1F2937]">
            Services
          </h2>

          <p className="text-gray-500 mt-2">
            Select the service you want to book.
          </p>

        </div>

      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {services.map((service) => (

          <div
            key={service.id}
            className="
            bg-white
            rounded-3xl
            border
            border-gray-200
            shadow-sm
            p-8
            hover:shadow-xl
            transition
            duration-300
            "
          >

            <div className="flex justify-between">

              <div>

                <div
                  className="
                  w-14
                  h-14
                  rounded-2xl
                  bg-[#F8F6F2]
                  flex
                  items-center
                  justify-center
                  mb-5
                  "
                >
                  <Camera
                    size={28}
                    className="text-[#1E3A8A]"
                  />
                </div>

                <h3 className="text-2xl font-semibold text-[#1F2937]">
                  {service.name}
                </h3>

                <p className="text-gray-500 mt-3 leading-7">

                  {service.description ||
                    "Professional event service provided by verified OccasionX partners."}

                </p>

              </div>

            </div>

            {/* Features */}

            <div className="space-y-3 mt-8">

              <div className="flex items-center gap-3">

                <CircleCheck
                  size={18}
                  className="text-green-600"
                />

                <span>Professional Team</span>

              </div>

              <div className="flex items-center gap-3">

                <CircleCheck
                  size={18}
                  className="text-green-600"
                />

                <span>Verified Provider</span>

              </div>

              <div className="flex items-center gap-3">

                <CircleCheck
                  size={18}
                  className="text-green-600"
                />

                <span>Best Price Guarantee</span>

              </div>

            </div>

            {/* Footer */}

            <div
              className="
              flex
              justify-between
              items-center
              mt-10
              "
            >

              <div>

                <p className="text-sm text-gray-500">
                  Starting From
                </p>

                <h3 className="text-3xl font-bold text-[#1F2937]">

                  ₹
                  {service.starting_price
                    ? service.starting_price.toLocaleString()
                    : "--"}

                </h3>

              </div>

              <button
                onClick={() =>
                  onSelectService(service)
                }
                className="
                bg-[#1E3A8A]
                hover:bg-[#182E6E]
                text-white
                rounded-xl
                px-6
                py-3
                font-medium
                flex
                items-center
                gap-2
                transition
                "
              >

                Select

                <ArrowRight size={18} />

              </button>

            </div>

          </div>

        ))}

      </div>

    </section>
  );
}