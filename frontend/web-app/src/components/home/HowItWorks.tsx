"use client";

import React from "react";
import { FiSearch, FiSliders, FiCheckCircle, FiSmile } from "react-icons/fi";

const STEPS = [
  {
    badge: "01",
    icon: <FiSearch />,
    title: "Search",
    description:
      "Choose your location, event date and category to discover verified providers.",
  },
  {
    badge: "02",
    icon: <FiSliders />,
    title: "Compare",
    description:
      "Review photos, packages, amenities, prices and real ratings in one place.",
  },
  {
    badge: "03",
    icon: <FiCheckCircle />,
    title: "Book",
    description:
      "Book securely with online payments and instant confirmations.",
  },
  {
    badge: "04",
    icon: <FiSmile />,
    title: "Celebrate",
    description:
      "Relax and enjoy a smooth, well-managed event with trusted professionals.",
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
  <section id="how-it-works" className="bg-[#F8F6F2] border-t border-[#E5E7EB] py-20 scroll-mt-28">
    <div className="max-w-7xl mx-auto px-6">

      {/* Heading */}
      <div className="text-center mb-14">
        <h2 className="text-4xl font-bold text-[#1F2937] mb-3">
          How OccasionX Works
        </h2>
        <p className="text-[#1E3A8A] text-lg">
          Plan your event in four simple steps.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map((step) => (
          <div
            key={step.badge}
            className="
              bg-white
              border
              border-[#E5E7EB]
              rounded-2xl
              p-6
              shadow-sm
              hover:shadow-lg
              hover:-translate-y-1
              transition-all
              duration-300
            "
          >
            {/* Badge */}
            <div className="w-12 h-12 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center font-bold mb-4">
              {step.badge}
            </div>

            {/* Icon */}
            <div className="text-[#1E3A8A] text-3xl mb-4">
              {step.icon}
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-[#1F2937] mb-3">
              {step.title}
            </h3>

            {/* Description */}
            <p className="text-[#1E3A8A] leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
};
