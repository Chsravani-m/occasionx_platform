"use client";

export default function SearchSkeleton() {

  return (

    <div
      className="
      grid
      grid-cols-1
      md:grid-cols-2
      xl:grid-cols-3
      gap-8
    "
    >

      {[1,2,3,4,5,6].map((item)=>(

        <div
          key={item}
          className="
            bg-white
            rounded-3xl
            overflow-hidden
            animate-pulse
            shadow
          "
        >

          <div className="h-64 bg-gray-200"/>

          <div className="p-6">

            <div className="h-6 w-48 bg-gray-200 rounded"/>

            <div className="h-4 w-32 bg-gray-100 rounded mt-4"/>

            <div className="h-4 w-40 bg-gray-100 rounded mt-4"/>

            <div className="h-10 w-full bg-gray-200 rounded-xl mt-8"/>

          </div>

        </div>

      ))}

    </div>

  );

}