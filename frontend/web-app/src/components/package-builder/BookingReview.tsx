"use client";

import { useEffect, useState } from "react";

import { PackageProvider } from "@/types/package";
import {
  calculateEstimatedCost,
  calculateNumDays,
  isAccommodationService,
  isGroomingService,
  BOOKING_CHARGE_AMOUNT,
  MAX_GUESTS_PER_ROOM,
  MAX_PEOPLE_QUANTITY,
} from "@/utils/pricing";
import { createBooking } from "@/services/bookingApi";
import { getEarliestBookableDate, getLatestBookableDate } from "@/utils/bookingRules";
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
import { useToast } from "@/context/NotificationContext";

interface BookingReviewProps {
  selectedServices: Record<string, PackageProvider>;
  guestCount?: number;
  packageName?: string;
  initialEventDate?: string;
  initialEndDate?: string;
  initialNotes?: string;
  onBack: () => void;
  onBookingSuccess?: (successfulServiceIds: string[]) => void;
  // When the date/room/people details were already collected on an
  // earlier page (e.g. the cart page, where each item now has its own
  // inline fields), this page should just read them back as a bill
  // instead of offering editable inputs again. Defaults to true so
  // flows that don't have an earlier per-item editing step (the
  // AI/custom package builder, etc.) keep working exactly as before.
  editableDetails?: boolean;
}

interface BookingResult {
  provider: PackageProvider;
  status: "success" | "error";
  message?: string;
  bookingId?: string;
}

type PaymentStatus = "processing" | "paid" | "failed";

export function BookingReview({
  selectedServices,
  guestCount,
  packageName,
  initialEventDate,
  initialEndDate,
  initialNotes,
  onBack,
  onBookingSuccess,
  editableDetails = true,
}: BookingReviewProps) {
  const toast = useToast();

  // Each service in a combined checkout can have its own event date
  // (and, for Accommodation/Makeup & Grooming, its own room/people
  // count) - a cart can easily mix a venue for one date with a makeup
  // service for another, so one shared date field for the whole batch
  // was silently overwriting whatever date each item already had.
  interface ServiceDetail {
    eventDate: string;
    eventTime: string;
    endDate: string;
    quantity: number;
  }

  const [serviceDetails, setServiceDetails] = useState<
    Record<string, ServiceDetail>
  >({});

  const [bookingChargePaid, setBookingChargePaid] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<BookingResult[] | null>(null);
  const [paymentStatuses, setPaymentStatuses] = useState<
    Record<string, PaymentStatus>
  >({});

  const services = Object.values(selectedServices);

  useEffect(() => {
    // Seed a detail entry for every service that doesn't have one yet
    // - each one's own event_date/event_end_date/quantity (carried
    // over from the provider page when it was added to the cart) wins
    // over the batch-level initialEventDate/initialEndDate fallback.
    // Once a service has an entry here, it's left alone - the
    // customer's own edits (including clearing a date) are never
    // overwritten by this effect re-running.
    setServiceDetails((prev) => {
      const next: Record<string, ServiceDetail> = {};

      services.forEach((service) => {
        const id = service.service_id;

        if (prev[id]) {
          next[id] = prev[id];
          return;
        }

        let quantity = 1;

        if (isAccommodationService(service)) {
          if (service.quantity) {
            quantity = service.quantity;
          } else if (service.occupancy_per_room) {
            quantity = Math.max(
              1,
              Math.ceil(
                (service.guest_count || guestCount || 0) /
                  service.occupancy_per_room
              )
            );
          }
        } else if (isGroomingService(service)) {
          quantity = Math.min(
            MAX_PEOPLE_QUANTITY,
            Math.max(1, service.quantity || service.min_quantity || 1)
          );
        }

        next[id] = {
          eventDate: service.event_date || initialEventDate || "",
          eventTime: service.event_time || "",
          endDate: service.event_end_date || initialEndDate || "",
          quantity,
        };
      });

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.map((s) => s.service_id).join(",")]);

  const detailFor = (service: PackageProvider): ServiceDetail =>
    serviceDetails[service.service_id] || {
      eventDate: "",
      endDate: "",
      quantity: 1,
    };

  const updateDetail = (
    serviceId: string,
    patch: Partial<ServiceDetail>
  ) => {
    setServiceDetails((prev) => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] || {
          eventDate: "",
          endDate: "",
          quantity: 1,
        }),
        ...patch,
      },
    }));
  };

  // Undefined here means "use the overall guest count" (calculateEstimatedCost's
  // default) - only Accommodation (rooms) and Makeup & Grooming (people)
  // get a customized quantity that overrides it. Every other category
  // (catering, decor, etc.) keeps pricing off the full guest count.
  const quantityFor = (service: PackageProvider) => {
    if (isAccommodationService(service) || isGroomingService(service)) {
      return detailFor(service).quantity;
    }
    return undefined;
  };

  const estimatedCostFor = (service: PackageProvider) => {
    const detail = detailFor(service);

    return calculateEstimatedCost(
      service.price,
      service.pricing_type,
      guestCount,
      service.min_quantity,
      service.max_quantity,
      calculateNumDays(detail.eventDate, detail.endDate),
      quantityFor(service)
    );
  };

  const providerFeesTotal = services.reduce(
    (sum, service) => sum + estimatedCostFor(service),
    0
  );

  // Charged per service, not a flat amount - matches what the backend
  // actually adds to the combined payment (see payForBookings below).
  // Once bookingChargePaid flips true (already collected earlier in
  // this session), it's no longer added again.
  const bookingChargeEstimate =
    !bookingChargePaid && !isPaidMember()
      ? BOOKING_CHARGE_AMOUNT * services.length
      : 0;

  const total = providerFeesTotal + bookingChargeEstimate;

  // Bookings are created AWAITING_PAYMENT, same as the single-service
  // "Book Now & Pay" flow - so they need payment right after they're
  // created, or they'll just sit unpaid (visible later from My
  // Bookings, but nothing prompts for it here otherwise). All the
  // bookings from one submission are charged together as a SINGLE
  // Razorpay order/popup - the backend splits that one payment across
  // each booking's provider internally (Route transfers), so the
  // customer isn't hit with a separate popup per service. When
  // includeBookingCharge is passed, the flat OX application fee rides
  // along in this SAME order/popup too (folded into the total on the
  // backend, kept with the platform since it never gets a Route
  // transfer entry) instead of being its own separate charge/popup.
  // Returns the final status per service id so callers can tell which
  // bookings actually got paid (as opposed to merely attempted) -
  // needed so a cart item only gets cleared once its booking is truly
  // paid for, not just because a booking row was created for it.
  const payForBookings = async (
    items: {
      bookingId: string;
      serviceId: string;
      serviceLabel: string;
    }[],
    options?: { includeBookingCharge?: boolean; customerId?: string }
  ): Promise<Record<string, PaymentStatus>> => {
    if (!items.length) return {};

    const markAll = (status: PaymentStatus) => {
      setPaymentStatuses((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          next[item.serviceId] = status;
        });
        return next;
      });
    };

    const finalize = (
      status: PaymentStatus
    ): Record<string, PaymentStatus> => {
      const map: Record<string, PaymentStatus> = {};
      items.forEach((item) => {
        map[item.serviceId] = status;
      });
      return map;
    };

    markAll("processing");

    try {
      const order = await createCombinedPaymentOrder(
        items.map((item) => item.bookingId),
        {
          customerId: options?.customerId,
          includeBookingCharge: options?.includeBookingCharge,
        }
      );

      // Dev/test mode: no real Razorpay order exists, so skip
      // checkout entirely and confirm every booking directly.
      if (order.test_mode) {
        await confirmTestCombinedPayment(order.order_id);
        markAll("paid");
        return finalize("paid");
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        markAll("failed");
        return finalize("failed");
      }

      return await new Promise<Record<string, PaymentStatus>>(
        (resolve) => {
          const razorpay = new window.Razorpay({
            key: order.razorpay_key_id,
            amount: order.amount,
            currency: order.currency,
            order_id: order.order_id,
            name: "OccasionX",
            description:
              items.length === 1
                ? items[0].serviceLabel
                : `${items.length} services`,
            prefill: {
              name: getCurrentUser()?.fullName,
              email: getCurrentUser()?.email,
            },
            theme: {
              color: "#1E3A8A",
            },
            handler: async (response: RazorpaySuccessResponse) => {
              try {
                await verifyCombinedPayment({
                  // Non-null: checkout was opened with order_id, so
                  // Razorpay always includes these in the success callback.
                  razorpay_order_id: response.razorpay_order_id!,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature!,
                });

                markAll("paid");
                resolve(finalize("paid"));
              } catch (err) {
                console.error(err);
                markAll("failed");
                resolve(finalize("failed"));
              }
            },
            modal: {
              ondismiss: () => {
                markAll("failed");
                resolve(finalize("failed"));
              },
            },
          });

          razorpay.open();
        }
      );
    } catch (err) {
      console.error(err);
      markAll("failed");
      return finalize("failed");
    }
  };

  const submitBookings = async (
    servicesToBook: PackageProvider[]
  ) => {
    const user = getCurrentUser();

    if (!user?.id) {
      toast.error("Please log in to confirm your booking");
      return;
    }

    for (const service of servicesToBook) {
      const detail = detailFor(service);

      if (!detail.eventDate) {
        toast.error(`Please select a date for ${service.service_name}`);
        return;
      }

      if (!detail.eventTime) {
        toast.error(`Please select an event time for ${service.service_name}`);
        return;
      }

      if (
        service.pricing_type === "PER_DAY" &&
        detail.endDate &&
        detail.endDate < detail.eventDate
      ) {
        toast.error(
          `Check-out date can't be before the check-in date for ${service.service_name}`
        );
        return;
      }

      if (
        isAccommodationService(service) &&
        (guestCount || 0) > detail.quantity * MAX_GUESTS_PER_ROOM
      ) {
        toast.error(
          `No. of guests per room should not exceed ${MAX_GUESTS_PER_ROOM} per room for ${service.service_name}. ` +
            `Increase the number of Rooms to fit ${guestCount} guests.`
        );
        return;
      }
    }

    if (!servicesToBook.length) return;

    setSubmitting(true);

    const settled = await Promise.allSettled(
      servicesToBook.map((service) => {
        const detail = detailFor(service);

        return createBooking({
          customer_id: user.id,
          provider_id: service.provider_id,
          service_id: service.service_id,
          pricing_id: service.pricing_id || "",
          event_date: detail.eventDate,
          event_time: detail.eventTime,
          event_end_date:
            service.pricing_type === "PER_DAY" && detail.endDate
              ? detail.endDate
              : undefined,
          quantity: quantityFor(service),
          guest_count: guestCount || 0,
          notes: notes.trim() || undefined,
          customer_name: user.fullName,
          customer_email: user.email,
          customer_phone: user.mobile,
          provider_name: service.provider_name,
          service_name: service.service_name,
          package_name: packageName || undefined,
          category_name: service.category_name || undefined,
          amount: estimatedCostFor(service),
        });
      })
    );

    const outcomes: BookingResult[] = settled.map(
      (outcome, index) => ({
        provider: servicesToBook[index],
        status: outcome.status === "fulfilled" ? "success" : "error",
        message:
          outcome.status === "rejected"
            ? outcome.reason?.response?.data?.detail ||
              "Booking failed"
            : undefined,
        bookingId:
          outcome.status === "fulfilled" ? outcome.value.id : undefined,
      })
    );

    setResults((prev) => {
      if (!prev) return outcomes;

      const byServiceId = new Map(
        prev.map((item) => [item.provider.service_id, item])
      );

      outcomes.forEach((item) =>
        byServiceId.set(item.provider.service_id, item)
      );

      return Array.from(byServiceId.values());
    });

    setSubmitting(false);

    // Each successful booking still needs payment (they're created
    // AWAITING_PAYMENT) - charge all of them together as one combined
    // Razorpay order/popup instead of one popup per booking. Only
    // bookings that actually finish PAID should disappear from the
    // cart - a created-but-unpaid booking (e.g. the customer closed
    // or canceled the Razorpay popup) needs to stay visible so the
    // customer can find and retry it, instead of silently vanishing.
    const paidOutcomes = outcomes.filter(
      (item) => item.status === "success" && item.bookingId
    );

    // Free members haven't paid the flat OX application fee yet - fold
    // it into this same payment instead of collecting it as its own
    // separate charge/popup beforehand. Once paid here, bookingChargePaid
    // flips true so a later retry (partial failure, or booking a second
    // batch in this same session) doesn't charge it again.
    const includeChargeThisAttempt = !bookingChargePaid && !isPaidMember();

    const paymentResults = await payForBookings(
      paidOutcomes.map((outcome) => ({
        bookingId: outcome.bookingId as string,
        serviceId: outcome.provider.service_id,
        serviceLabel: outcome.provider.service_name,
      })),
      {
        includeBookingCharge: includeChargeThisAttempt,
        customerId: user.id,
      }
    );

    const paidServiceIds = Object.entries(paymentResults)
      .filter(([, status]) => status === "paid")
      .map(([serviceId]) => serviceId);

    if (paidServiceIds.length > 0) {
      onBookingSuccess?.(paidServiceIds);

      if (includeChargeThisAttempt) {
        setBookingChargePaid(true);
      }
    }
  };

  const handleConfirm = () => submitBookings(services);

  const handleRetryFailed = () => {
    if (!results) return;

    const failedProviders = results
      .filter((result) => result.status === "error")
      .map((result) => result.provider);

    void submitBookings(failedProviders);
  };

  if (results) {
    const successCount = results.filter(
      (result) => result.status === "success"
    ).length;

    const failedResults = results.filter(
      (result) => result.status === "error"
    );

    return (
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">
          {failedResults.length === 0
            ? "Booking Confirmed"
            : "Booking Partially Confirmed"}
        </h2>

        <p className="mt-2 text-gray-600">
          {successCount} of {results.length} provider
          {results.length === 1 ? "" : "s"} booked successfully.
        </p>

        {successCount > 0 && !isPaidMember() && (
          <p className="mt-1 text-xs text-[#5B756D]">
            An application fee was included together with the payment
            below to confirm these bookings, in addition to each
            provider's fee.
          </p>
        )}

        <div className="mt-4 space-y-2">
          {results.map((result) => (
            <div
              key={result.provider.service_id}
              className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                result.status === "success"
                  ? "border-[#B9C1DA] bg-[#F2F3F8]"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <span>
                {result.provider.provider_name} —{" "}
                {result.provider.service_name}
                {result.status === "success" && (
                  <span className="ml-2 text-xs text-[#5B756D]">
                    (Service Provider Fee: ₹
                    {estimatedCostFor(
                      result.provider
                    ).toLocaleString("en-IN")}
                    )
                  </span>
                )}
              </span>

              {result.status === "success" ? (
                <span className="flex items-center gap-2">
                  {(() => {
                    const paymentStatus =
                      paymentStatuses[result.provider.service_id];

                    if (paymentStatus === "paid") {
                      return (
                        <span className="text-[#16A34A]">
                          Booked & Paid
                        </span>
                      );
                    }

                    if (paymentStatus === "processing") {
                      return (
                        <span className="text-[#182E6E]">
                          Processing payment...
                        </span>
                      );
                    }

                    if (paymentStatus === "failed") {
                      return (
                        <button
                          onClick={() => {
                            const includeChargeThisAttempt =
                              !bookingChargePaid && !isPaidMember();

                            void payForBookings(
                              [
                                {
                                  bookingId: result.bookingId as string,
                                  serviceId: result.provider.service_id,
                                  serviceLabel:
                                    result.provider.service_name,
                                },
                              ],
                              {
                                includeBookingCharge:
                                  includeChargeThisAttempt,
                                customerId: getCurrentUser()?.id,
                              }
                            ).then((statuses) => {
                              if (
                                statuses[result.provider.service_id] ===
                                "paid"
                              ) {
                                onBookingSuccess?.([
                                  result.provider.service_id,
                                ]);

                                if (includeChargeThisAttempt) {
                                  setBookingChargePaid(true);
                                }
                              }
                            });
                          }}
                          className="text-red-600 underline"
                        >
                          Payment failed - Retry Payment
                        </button>
                      );
                    }

                    return (
                      <span className="text-[#182E6E]">Booked</span>
                    );
                  })()}
                </span>
              ) : (
                <span className="text-red-600">
                  {result.message || "Failed"}
                </span>
              )}
            </div>
          ))}
        </div>

        {failedResults.length > 0 && (
          <button
            onClick={handleRetryFailed}
            disabled={submitting}
            className="mt-4 rounded-lg bg-[#1E3A8A] px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Retrying..."
              : `Retry ${failedResults.length} Failed Booking${
                  failedResults.length === 1 ? "" : "s"
                }`}
          </button>
        )}

        {successCount > 0 && (
          <a
            href="/my-bookings"
            className="mt-4 inline-block rounded-lg border border-[#1E3A8A] px-4 py-2 text-[#182E6E] hover:bg-[#F2F3F8]"
          >
            View My Bookings
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <button
        onClick={onBack}
        className="text-sm font-medium text-[#182E6E]"
      >
        ← Back to providers
      </button>

      <h2 className="mt-4 text-xl font-semibold">
        Review Your Booking
      </h2>

      <div className="mt-4 space-y-3">
        {services.map((service) => {
          const detail = detailFor(service);
          const isAccommodation = isAccommodationService(service);
          const isGrooming = isGroomingService(service);
          const isPerDay = service.pricing_type === "PER_DAY";

          return (
            <div
              key={service.service_id}
              className="rounded-lg border p-3"
            >
              <div className="flex justify-between text-sm font-medium text-[#1F2937]">
                <span>
                  {service.provider_name} — {service.service_name}
                </span>

                <span>
                  ₹{estimatedCostFor(service).toLocaleString("en-IN")}
                </span>
              </div>

              {editableDetails ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      {isPerDay ? "Check-in Date" : "Event Date"}
                    </label>

                    <input
                      type="date"
                      value={detail.eventDate}
                      min={getEarliestBookableDate()}
                      max={getLatestBookableDate()}
                      onChange={(e) =>
                        updateDetail(service.service_id, {
                          eventDate: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border p-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      {isPerDay ? "Check-in Time" : "Event Time"}
                    </label>

                    <input
                      type="time"
                      value={detail.eventTime}
                      onChange={(e) =>
                        updateDetail(service.service_id, {
                          eventTime: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border p-2 text-sm"
                    />
                  </div>

                  {isPerDay && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Check-out Date
                      </label>

                      <input
                        type="date"
                        value={detail.endDate}
                        min={detail.eventDate || getEarliestBookableDate()}
                        max={getLatestBookableDate()}
                        onChange={(e) =>
                          updateDetail(service.service_id, {
                            endDate: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border p-2 text-sm"
                      />
                    </div>
                  )}

                  {isAccommodation && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Rooms
                      </label>

                      <input
                        type="number"
                        min={1}
                        value={detail.quantity}
                        onChange={(e) =>
                          updateDetail(service.service_id, {
                            quantity: Math.max(
                              1,
                              Number(e.target.value) || 1
                            ),
                          })
                        }
                        className="w-full rounded-lg border p-2 text-sm"
                      />

                      {service.total_rooms && (
                        <p className="mt-1 text-xs text-[#16A34A] font-medium">
                          {service.total_rooms} available
                        </p>
                      )}
                    </div>
                  )}

                  {isGrooming && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Number of People
                      </label>

                      <input
                        type="number"
                        min={1}
                        max={MAX_PEOPLE_QUANTITY}
                        value={detail.quantity}
                        onChange={(e) =>
                          updateDetail(service.service_id, {
                            quantity: Math.min(
                              MAX_PEOPLE_QUANTITY,
                              Math.max(1, Number(e.target.value) || 1)
                            ),
                          })
                        }
                        className="w-full rounded-lg border p-2 text-sm"
                      />

                      <p className="mt-1 text-xs text-gray-500">
                        How many people you want to cover (max{" "}
                        {MAX_PEOPLE_QUANTITY}).
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Details were already collected on an earlier page
                // (e.g. the cart page) - just display them as a bill
                // line instead of offering inputs again.
                <div className="mt-2 text-xs text-gray-600">
                  <span>
                    {isPerDay ? "Check-in" : "Event Date"}:{" "}
                    {detail.eventDate || "Not set"}
                  </span>

                  {isPerDay && detail.endDate && (
                    <span> · Check-out: {detail.endDate}</span>
                  )}

                  {isAccommodation && (
                    <span> · Rooms: {detail.quantity}</span>
                  )}

                  {isGrooming && (
                    <span> · People: {detail.quantity}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <hr className="my-4" />

      {bookingChargeEstimate > 0 && (
        <>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Provider Fees Subtotal</span>

            <span>₹{providerFeesTotal.toLocaleString("en-IN")}</span>
          </div>

          <div className="mt-1 flex justify-between text-sm text-gray-600">
            <span>
              Application Fee ({services.length} service
              {services.length === 1 ? "" : "s"})
            </span>

            <span>
              ₹{bookingChargeEstimate.toLocaleString("en-IN")}
            </span>
          </div>

          <hr className="my-2" />
        </>
      )}

      <div className="flex justify-between font-semibold">
        <span>Total</span>

        <span>₹{total.toLocaleString("en-IN")}</span>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes (optional)
        </label>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border p-2"
        />
      </div>

      {!bookingChargePaid && !isPaidMember() && (
        <p className="mt-4 text-center text-xs text-[#182E6E] bg-[#F2F3F8] rounded-lg py-2 px-3">
          Free members pay a small application fee, added automatically
          to the payment below. Upgrade to a paid membership to skip it.
        </p>
      )}

      <button
        onClick={handleConfirm}
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-[#1E3A8A] py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Booking..." : "Confirm Booking"}
      </button>
    </div>
  );
}