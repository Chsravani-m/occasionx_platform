"use client";

import type { Review } from "@/services/reviewApi";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={
            star <= rating ? "text-amber-400" : "text-gray-300"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}

interface ReviewsSectionProps {
  reviews: Review[];
}

export default function ReviewsSection({
  reviews,
}: ReviewsSectionProps) {
  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <section className="mt-10">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-[#1F2937]">
            Reviews
          </h2>

          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRow rating={Math.round(average)} />
              <span className="text-gray-500 text-sm">
                {average.toFixed(1)} ({reviews.length}{" "}
                {reviews.length === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-gray-500">
            No reviews yet. Be the first to book and rate this
            provider.
          </p>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl bg-[#F8F6F2] p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#1F2937]">
                    {review.customer_name || "OccasionX Customer"}
                  </p>

                  <span className="text-gray-400 text-sm">
                    {new Date(review.created_at).toLocaleDateString(
                      "en-IN",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </span>
                </div>

                <div className="mt-1">
                  <StarRow rating={review.rating} />
                </div>

                {review.service_name && (
                  <p className="mt-2 text-sm text-gray-400">
                    {review.service_name}
                  </p>
                )}

                {review.comment && (
                  <p className="mt-2 text-gray-600">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
