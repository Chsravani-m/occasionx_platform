"use client";

import { getImageUrl } from "@/lib/image";

interface GalleryItem {
  id: string;
  media_url: string;
  title?: string;
}

interface GalleryGridProps {
  images: GalleryItem[];
}

export default function GalleryGrid({
  images,
}: GalleryGridProps) {

  console.log("IMAGES", images);

  if (!images || images.length === 0) {
    return null;
  }

  const first = images[0];
  const others = images.slice(1, 5);

  return (
    <section className="mt-10">

      <div className="flex items-center justify-between mb-6">

        <h2 className="text-3xl font-bold text-[#1F2937]">
          Gallery
        </h2>

        <button
          className="
          text-[#1E3A8A]
          font-medium
          hover:underline
          "
        >
          View all photos
        </button>

      </div>

      <div
        className="
        grid
        grid-cols-4
        gap-3
        rounded-3xl
        overflow-hidden
        "
      >
        {/* Main Image */}

        <div className="col-span-2 row-span-2 h-[520px]">

          <img
            src={getImageUrl(first.media_url)}
            alt={first.title}
            className="
            w-full
            h-full
            object-cover
            hover:scale-105
            transition
            duration-500
            "
          />

        </div>

        {/* Remaining */}

        {others.map((image, index) => (

          <div
            key={image.id}
            className="relative h-[255px]"
          >

            <img
              src={getImageUrl(image.media_url)}
              alt={image.title}
              className="
              w-full
              h-full
              object-cover
              hover:scale-105
              transition
              duration-500
              "
            />

            {index === 3 &&
              images.length > 5 && (

                <div
                  className="
                  absolute
                  inset-0
                  bg-black/60
                  flex
                  items-center
                  justify-center
                  text-white
                  text-3xl
                  font-bold
                  "
                >
                  +{images.length - 5}
                </div>

              )}

          </div>

        ))}

      </div>

    </section>
  );
}