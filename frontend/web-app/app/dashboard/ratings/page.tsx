"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

import { getCustomerBookings, type Booking } from "@/services/bookingApi";
import { getBookingReview, type Review } from "@/services/reviewApi";
import { getCurrentUser } from "@/utils/auth";

interface RatedBooking {
  booking: Booking;
  review: Review;
}

export default function MyRatingsPage() {
  const [rated, setRated] = useState<RatedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const user = getCurrentUser();

        if (!user?.id) {
          setError("Please log in to view your ratings.");
          return;
        }

        const bookings = await getCustomerBookings(user.id);

        // No "list my reviews" endpoint exists yet - each booking
        // either has a review or doesn't (see getBookingReview /
        // GET /bookings/{id}/review), so this checks every booking
        // and keeps the ones that come back with one.
        const results = await Promise.all(
          bookings.map(async (booking) => {
            try {
              const review = await getBookingReview(booking.id);
              return review ? { booking, review } : null;
            } catch {
              return null;
            }
          })
        );

        setRated(results.filter((r): r is RatedBooking => r !== null));
      } catch (err) {
        console.error(err);
        setError("Unable to load your ratings.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        Loading your ratings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold text-[#1F2937]">My Ratings</h1>
        <p className="mb-8 text-[#5B756D]">
          Reviews you've left for providers you've booked.
        </p>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {!error && rated.length === 0 && (
          <div className="rounded-3xl border border-dashed bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-[#1F2937]">
              No ratings yet
            </h3>
            <p className="mt-2 text-[#5B756D]">
              Once you rate a completed booking, it'll show up here.
            </p>
            <Link
              href="/my-bookings"
              className="mt-4 inline-block text-[#182E6E] underline"
            >
              Go to My Bookings
            </Link>
          </div>
        )}

        {!error && rated.length > 0 && (
          <div className="space-y-4">
            {rated.map(({ booking, review }) => (
              <div
                key={booking.id}
                className="rounded-2xl bg-white p-5 shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#1F2937]">
                      {booking.service_name || "Service"}
                      {booking.provider_name ? ` — ${booking.provider_name}` : ""}
                    </p>
                    <p className="text-sm text-[#5B756D]">
                      {booking.event_date}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[#1E3A8A]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={
                          i < review.rating
                            ? "fill-[#C89B3C] text-[#C89B3C]"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>
                </div>

                {review.comment && (
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
