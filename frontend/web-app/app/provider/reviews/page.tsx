"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getProviderReviews, type Review } from "@/services/reviewApi";
import ReviewsSection from "@/components/provider/ReviewsSection";

// A provider previously had no dedicated place to read what customers
// wrote - only an aggregate rating/review-count stat on the dashboard,
// or their own public listing page. This reuses the same
// ReviewsSection.tsx component (and same GET /bookings/provider/{id}/reviews
// call) that already renders reviews on the public provider profile,
// so the visual treatment is identical.
export default function ProviderReviewsPage() {
  const router = useRouter();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const providerId = localStorage.getItem("provider_id");

    if (!providerId) {
      router.push("/provider/login");
      return;
    }

    getProviderReviews(providerId)
      .then(setReviews)
      .catch((err) => {
        console.error(err);
        setError("Couldn't load your reviews. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/provider/dashboard"
          className="text-sm font-medium text-[#182E6E]"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-[#1F2937]">
          Reviews
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          What customers are saying about your services.
        </p>

        {loading ? (
          <p className="mt-8 text-gray-500">Loading your reviews...</p>
        ) : error ? (
          <p className="mt-8 text-red-600">{error}</p>
        ) : (
          <ReviewsSection reviews={reviews} />
        )}
      </div>
    </div>
  );
}
