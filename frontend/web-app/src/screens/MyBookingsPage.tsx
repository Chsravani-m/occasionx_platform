"use client";

import { useEffect, useState } from "react";

import {
  getCustomerBookings,
  formatBookingDates,
  cancelBooking,
  type Booking,
} from "@/services/bookingApi";
import { canCancelBooking } from "@/utils/bookingRules";
import { useToast, useConfirm } from "@/context/NotificationContext";
import { getProvider } from "@/services/providerApi";
import { getCurrentUser, isPaidMember } from "@/utils/auth";
import {
  createCombinedPaymentOrder,
  verifyCombinedPayment,
  confirmTestCombinedPayment,
} from "@/services/paymentApi";
import {
  loadRazorpayScript,
  type RazorpaySuccessResponse,
} from "@/utils/razorpay";
import { BOOKING_CHARGE_AMOUNT } from "@/utils/pricing";
import {
  createReview,
  getBookingReview,
  type Review,
} from "@/services/reviewApi";

// A booking can be rated once it's CONFIRMED and its event (or, for
// multi-day bookings, its last day) is in the past.
function isRatable(booking: Booking): boolean {
  if (booking.booking_status !== "CONFIRMED") {
    return false;
  }

  const lastDay = booking.event_end_date || booking.event_date;
  const today = new Date().toISOString().slice(0, 10);

  return lastDay < today;
}

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl leading-none ${
            star <= value ? "text-amber-400" : "text-gray-300"
          }`}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
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

function statusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-[#E0E4EF] text-[#182E6E]";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "EXPIRED":
      return "bg-gray-200 text-gray-600";
    case "AWAITING_PAYMENT":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function statusLabel(status: string) {
  if (status === "AWAITING_PAYMENT") {
    return "Payment required";
  }

  if (status === "EXPIRED") {
    return "Expired - payment window closed";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  return status;
}

// A booking can still be cancelled while it holds a date - PENDING
// (unused in practice)/AWAITING_PAYMENT/CONFIRMED - and only if the
// event itself hasn't already happened (see bookingRules.ts). Backend
// re-checks both on the actual cancel call.
function isCancellable(booking: Booking): boolean {
  if (
    !["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(
      booking.booking_status
    )
  ) {
    return false;
  }

  return canCancelBooking(booking.event_date, booking.event_time);
}

export function MyBookingsPage() {
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providerPhones, setProviderPhones] = useState<
    Record<string, string>
  >({});
  // The provider's own free-text cancellation policy, surfaced only
  // when the customer actually clicks Cancel Booking (see
  // handleCancel) instead of as permanent copy on every booking card.
  const [cancellationPolicies, setCancellationPolicies] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [ratingDrafts, setRatingDrafts] = useState<
    Record<string, { rating: number; comment: string }>
  >({});
  const [submittingReviewId, setSubmittingReviewId] = useState<
    string | null
  >(null);

  async function loadBookings() {
    try {
      const user = getCurrentUser();

      if (!user?.id) {
        setError("Please log in to view your bookings.");
        return;
      }

      const data = await getCustomerBookings(user.id);

      setBookings(data);

      const uniqueProviderIds = Array.from(
        new Set(data.map((b) => b.provider_id))
      );

      const results = await Promise.allSettled(
        uniqueProviderIds.map((id) => getProvider(id))
      );

      const phoneMap: Record<string, string> = {};
      const policyMap: Record<string, string> = {};

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          phoneMap[uniqueProviderIds[index]] =
            result.value.phone;

          if (result.value.cancellation_policy) {
            policyMap[uniqueProviderIds[index]] =
              result.value.cancellation_policy;
          }
        }
      });

      setProviderPhones(phoneMap);
      setCancellationPolicies(policyMap);

      const ratableBookings = data.filter(isRatable);

      const reviewResults = await Promise.allSettled(
        ratableBookings.map((b) => getBookingReview(b.id))
      );

      const reviewMap: Record<string, Review> = {};

      reviewResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          reviewMap[ratableBookings[index].id] = result.value;
        }
      });

      setReviews(reviewMap);
    } catch (err) {
      console.error(err);
      setError("Unable to load your bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function handleSubmitReview(booking: Booking) {
    const draft = ratingDrafts[booking.id];

    if (!draft?.rating) {
      toast.error("Please select a star rating.");
      return;
    }

    const user = getCurrentUser();

    if (!user?.id) {
      return;
    }

    try {
      setSubmittingReviewId(booking.id);

      const review = await createReview({
        booking_id: booking.id,
        customer_id: user.id,
        rating: draft.rating,
        comment: draft.comment || undefined,
      });

      setReviews((prev) => ({ ...prev, [booking.id]: review }));
      toast.success("Thanks for rating this booking!");
    } catch (err) {
      console.error(err);
      toast.error("Unable to submit your rating. Please try again.");
    } finally {
      setSubmittingReviewId(null);
    }
  }

  async function handlePayNow(booking: Booking) {
    try {
      setPayingId(booking.id);

      // Uses the same combined-order endpoint as a fresh booking (see
      // ProviderDetailsPage's startPayment) with a single booking id,
      // so a retry here still folds the OX application fee into this
      // one payment for free-plan customers - nothing was charged yet
      // if the earlier attempt was cancelled/failed, so it's safe to
      // include it again.
      const order = await createCombinedPaymentOrder([booking.id], {
        customerId: getCurrentUser()?.id,
        includeBookingCharge: !isPaidMember(),
      });

      // Dev/test mode: no real Razorpay order exists, so skip
      // checkout entirely and confirm the booking directly instead
      // of opening the payment widget. No visible gateway popup is
      // expected here - alert so it's obvious the payment (simulated)
      // actually went through rather than silently doing nothing.
      if (order.test_mode) {
        await confirmTestCombinedPayment(order.order_id);
        await loadBookings();
        toast.success(
          "Test mode: payment simulated, no real charge made. Your " +
            "booking is now confirmed."
        );
        setPayingId(null);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        toast.error(
          "Unable to load the payment gateway. Check your connection and try again."
        );
        return;
      }

      const razorpay = new window.Razorpay({
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "OccasionX",
        description: booking.service_name || "Booking payment",
        prefill: {
          name: getCurrentUser()?.fullName,
          email: getCurrentUser()?.email,
        },
        theme: {
          color: "#1F2937",
        },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            await verifyCombinedPayment({
              // Non-null: checkout was opened with order_id, so Razorpay
              // always includes these in the success callback.
              razorpay_order_id: response.razorpay_order_id!,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature!,
            });

            await loadBookings();
            toast.success("Payment successful - your booking is confirmed.");
          } catch (err) {
            console.error(err);
            toast.error(
              "Payment verification failed. If money was deducted, it will be refunded - please contact support."
            );
          } finally {
            setPayingId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setPayingId(null);
          },
        },
      });

      razorpay.open();
    } catch (err) {
      console.error(err);
      toast.error("Unable to start payment. Please try again.");
      setPayingId(null);
    }
  }

  async function handleCancel(booking: Booking) {
    // Surface the provider's actual cancellation policy right here at
    // the moment it's relevant, instead of as permanent copy on every
    // booking card - falls back to the general rule (see
    // bookingRules.ts / isCancellable above) when a provider hasn't
    // set a free-text policy of their own.
    const policy =
      cancellationPolicies[booking.provider_id] ||
      "This booking can be cancelled any time before the event.";

    const confirmed = await confirmDialog({
      title: "Cancel this booking?",
      message:
        `${booking.service_name || "This service"}\n\n` +
        `Cancellation policy: ${policy}\n\n` +
        `This can't be undone.`,
      confirmText: "Cancel Booking",
      cancelText: "Keep Booking",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(booking.id);
      await cancelBooking(booking.id);
      await loadBookings();
      toast.success("Booking cancelled.");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;

      // A 400 here is the backend's real cancellation rule kicking in
      // (booking status changed, or the event's cutoff already passed
      // since this page loaded) - not a bug, so don't spam it to the
      // console as an uncaught-looking error (Next's dev overlay
      // surfaces every console.error as a red screen even when it's
      // already handled below via the toast). Anything else is
      // unexpected and still worth logging.
      if (err?.response?.status !== 400) {
        console.error(err);
      }

      toast.error(
        typeof detail === "string" ? detail : "Unable to cancel this booking."
      );
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        Loading your bookings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-[#1F2937]">
          My Bookings
        </h1>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {!error && bookings.length === 0 && (
          <div className="rounded-3xl border border-dashed bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-[#1F2937]">
              No bookings yet
            </h3>

            <p className="mt-2 text-[#5B756D]">
              Build a package and confirm a booking to see it here.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-3xl bg-white p-6 shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#1F2937]">
                    {booking.service_name || "Service"}
                  </h3>

                  <p className="text-[#5B756D]">
                    {booking.provider_name}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor(
                    booking.booking_status
                  )}`}
                >
                  {statusLabel(booking.booking_status)}
                </span>
              </div>

              <hr className="my-4" />

              <div className="grid grid-cols-2 gap-y-2 text-sm text-[#1F2937] sm:grid-cols-3">
                {booking.package_name && (
                  <p>
                    <strong>Package:</strong> {booking.package_name}
                  </p>
                )}

                <p>
                  <strong>Date:</strong> {formatBookingDates(booking)}
                </p>

                <p>
                  <strong>Guests:</strong> {booking.guest_count}
                </p>

                {booking.quantity && booking.quantity > 1 && (
                  <p>
                    <strong>Rooms:</strong> {booking.quantity}
                  </p>
                )}

                {!!booking.amount &&
                  booking.booking_status !== "AWAITING_PAYMENT" && (
                    <p>
                      <strong>Service Provider Fee:</strong>{" "}
                      ₹{booking.amount.toLocaleString("en-IN")}
                    </p>
                  )}

                {!!booking.application_fee &&
                  booking.booking_status !== "AWAITING_PAYMENT" && (
                    <p>
                      <strong>Application Fee:</strong>{" "}
                      ₹{booking.application_fee.toLocaleString("en-IN")}
                    </p>
                  )}

                {booking.notes && (
                  <p className="col-span-2 sm:col-span-3">
                    <strong>Notes:</strong> {booking.notes}
                  </p>
                )}

                {booking.booking_status !== "REJECTED" &&
                  providerPhones[booking.provider_id] && (
                    <p className="col-span-2 sm:col-span-3">
                      <strong>Contact:</strong>{" "}
                      <a
                        href={`tel:${providerPhones[booking.provider_id]}`}
                        className="text-[#5B756D] underline"
                      >
                        {providerPhones[booking.provider_id]}
                      </a>
                    </p>
                  )}
              </div>

              {booking.booking_status === "AWAITING_PAYMENT" && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-blue-50 p-4">
                  <p className="text-sm text-[#1F2937]">
                    Pay{" "}
                    <strong>
                      ₹
                      {(
                        (booking.amount || 0) +
                        (!isPaidMember() ? BOOKING_CHARGE_AMOUNT : 0)
                      ).toLocaleString("en-IN")}
                    </strong>{" "}
                    {!isPaidMember()
                      ? "(service provider fee + application fee)"
                      : "(service provider fee)"}{" "}
                    to confirm this booking.
                  </p>

                  <button
                    onClick={() => handlePayNow(booking)}
                    disabled={payingId === booking.id}
                    className="ml-4 shrink-0 rounded-full bg-[#1F2937] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {payingId === booking.id ? "Processing..." : "Pay Now"}
                  </button>
                </div>
              )}

              {isCancellable(booking) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleCancel(booking)}
                    disabled={cancellingId === booking.id}
                    className="shrink-0 rounded-full border border-red-600 px-5 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
                  >
                    {cancellingId === booking.id
                      ? "Cancelling..."
                      : "Cancel Booking"}
                  </button>
                </div>
              )}

              {isRatable(booking) && (
                <div className="mt-4 rounded-2xl bg-[#F8F6F2] p-4">
                  {reviews[booking.id] ? (
                    <div>
                      <p className="mb-1 text-sm font-semibold text-[#1F2937]">
                        Your rating
                      </p>

                      <StarDisplay rating={reviews[booking.id].rating} />

                      {reviews[booking.id].comment && (
                        <p className="mt-2 text-sm text-[#5B756D]">
                          {reviews[booking.id].comment}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-[#1F2937]">
                        Rate this service
                      </p>

                      <StarRatingInput
                        value={ratingDrafts[booking.id]?.rating || 0}
                        onChange={(rating) =>
                          setRatingDrafts((prev) => ({
                            ...prev,
                            [booking.id]: {
                              rating,
                              comment: prev[booking.id]?.comment || "",
                            },
                          }))
                        }
                      />

                      <textarea
                        value={ratingDrafts[booking.id]?.comment || ""}
                        onChange={(e) =>
                          setRatingDrafts((prev) => ({
                            ...prev,
                            [booking.id]: {
                              rating: prev[booking.id]?.rating || 0,
                              comment: e.target.value,
                            },
                          }))
                        }
                        placeholder="Optional comment..."
                        className="mt-3 w-full rounded-xl border border-gray-200 p-2 text-sm"
                        rows={2}
                      />

                      <button
                        onClick={() => handleSubmitReview(booking)}
                        disabled={submittingReviewId === booking.id}
                        className="mt-3 rounded-full bg-[#1F2937] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {submittingReviewId === booking.id
                          ? "Submitting..."
                          : "Submit Rating"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
