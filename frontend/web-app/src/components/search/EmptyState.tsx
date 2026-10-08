"use client";

import { SearchX } from "lucide-react";

export default function EmptyState() {

  return (

    <div
      className="
      flex
      flex-col
      items-center
      justify-center
      py-24
    "
    >

      <SearchX
        size={90}
        className="text-gray-300"
      />

      <h2
        className="
        mt-6
        text-3xl
        font-bold
        text-[#1F2937]
      "
      >
        No Providers Found
      </h2>

      <p
        className="
        mt-3
        text-gray-500
      "
      >
        Try changing filters or searching another city.
      </p>

    </div>

  );

}