"use client";

import { Calendar, Clock, Users, FileText } from "lucide-react";

import { MAX_PEOPLE_QUANTITY } from "@/utils/pricing";

interface BookingCardProps {
  serviceName?: string;

  packageName?: string;

  price?: number;

  pricingType?: string | null;

  // Only Accommodation-category PER_DAY services get a Rooms input -
  // venues (banquet halls etc.) are flat per-day, no room count.
  showRooms?: boolean;

  // Per-person services like Makeup & Grooming get a "Number of
  // People" input instead - not every guest at the event needs the
  // service, so it shouldn't default to the full guest count.
  showPeopleCount?: boolean;

  // Total rooms/suites the provider has at this pricing tier, if
  // they've set one - shown as availability info under the Rooms
  // input.
  totalRooms?: number | null;

  // Shown as a note above the Book button when the current customer
  // is a free (non-paid-member) user - they pay a small booking
  // service charge to confirm a booking, paid members don't.
  isFreeUser?: boolean;

  // The OX application fee for this booking, already zeroed out by
  // the caller for paid members - folded into the same payment as the
  // service price below (see ProviderDetailsPage's startPayment),
  // instead of being a separate charge/popup.
  applicationFee?: number;

  selectedDate: string;

  // The event's start time - required so the provider's own
  // booking_notice_hours can be checked against the real event
  // date+time (e.g. a 12:00pm event can be booked from 6:00am the
  // same day if the provider requires 6 hours' notice).
  eventTime: string;

  onTimeChange: (time: string) => void;

  // The owning provider's own booking notice + cancellation policy,
  // shown to the customer before they book (see
  // services/providerBookingPolicyApi.ts).
  bookingNoticeHours?: number;

  cancellationPolicy?: string | null;

  // Category-aware earliest bookable date + the universal 90-day
  // booking window (see src/utils/bookingRules.ts) - passed in by the
  // caller since only it knows this service's category_name.
  minDate?: string;

  maxDate?: string;

  endDate?: string;

  quantity?: number;

  guestCount: number;

  notes: string;

  onDateChange: (
    date: string
  ) => void;

  onEndDateChange?: (
    date: string
  ) => void;

  onQuantityChange?: (
    quantity: number
  ) => void;

  onGuestChange: (
    guests: number
  ) => void;

  onNotesChange: (
    notes: string
  ) => void;

  onBook: () => void;

  submitting?: boolean;

  onAddToCart?: () => void;

  addedToCart?: boolean;
}

export default function BookingCard({

  serviceName,

  packageName,

  price,

  pricingType,

  showRooms,

  showPeopleCount,

  totalRooms,

  isFreeUser,

  applicationFee,

  selectedDate,

  eventTime,

  onTimeChange,

  bookingNoticeHours,

  cancellationPolicy,

  minDate,

  maxDate,

  endDate,

  quantity,

  guestCount,

  notes,

  onDateChange,

  onEndDateChange,

  onQuantityChange,

  onGuestChange,

  onNotesChange,

  onBook,

  submitting,

  onAddToCart,

  addedToCart,

}: BookingCardProps) {

  const isPerDay = pricingType === "PER_DAY";

  const fee = applicationFee || 0;
  const total = (price || 0) + fee;

  return (

    <div
      className="
      sticky
      top-24
      bg-white
      rounded-3xl
      shadow-xl
      border
      border-gray-200
      p-8
      "
    >

      <h2 className="text-2xl font-bold">

        Book this Service

      </h2>

      <p className="text-gray-500 mt-2">

        Complete your booking details.

      </p>

      {/* Price */}

      <div className="mt-8">

        <p className="text-gray-500">

          Total

        </p>

        <h2 className="text-4xl font-bold text-[#1F2937]">

          ₹
          {price
            ? total.toLocaleString()
            : "--"}

        </h2>

      </div>

      {/* Service */}

      <div className="mt-8">

        <label className="font-medium">

          Selected Service

        </label>

        <div className="mt-2 bg-[#F8F6F2] rounded-xl p-4">

          {serviceName || "-"}

        </div>

      </div>

      {/* Package */}

      <div className="mt-6">

        <label className="font-medium">

          Package

        </label>

        <div className="mt-2 bg-[#F8F6F2] rounded-xl p-4">

          {packageName || "-"}

        </div>

      </div>

      {/* Date */}

      <div className="mt-6">

        <label className="font-medium flex items-center gap-2">

          <Calendar size={18} />

          {isPerDay ? "Check-in Date" : "Event Date"}

        </label>

        <input
          type="date"
          className="
          w-full
          mt-2
          border
          rounded-xl
          p-3
          "
          value={selectedDate}
          min={minDate}
          max={maxDate}
          onChange={(e) =>
            onDateChange(
              e.target.value
            )
          }
        />

      </div>

      {/* Event time - checked against the provider's own required
          notice window (bookingNoticeHours) rather than just the date. */}

      <div className="mt-6">

        <label className="font-medium flex items-center gap-2">

          <Clock size={18} />

          {isPerDay ? "Check-in Time" : "Event Time"}

        </label>

        <input
          type="time"
          className="w-full mt-2 border rounded-xl p-3"
          value={eventTime}
          onChange={(e) => onTimeChange(e.target.value)}
        />

        {typeof bookingNoticeHours === "number" && (
          <p className="mt-1 text-xs text-gray-500">
            This provider needs at least {bookingNoticeHours} hour(s)
            notice before the event.
          </p>
        )}

      </div>

      {/* Number of people (per-person pricing, e.g. Makeup & Grooming) */}

      {showPeopleCount && (
        <div className="mt-6">

          <label className="font-medium flex items-center gap-2">

            <Users size={18} />

            Number of People

          </label>

          <input
            type="number"
            min={1}
            max={MAX_PEOPLE_QUANTITY}
            className="w-full mt-2 border rounded-xl p-3"
            value={quantity ?? 1}
            onChange={(e) => {
              const raw = Math.max(1, Number(e.target.value) || 1);

              onQuantityChange?.(
                Math.min(MAX_PEOPLE_QUANTITY, raw)
              );
            }}
          />

          <p className="mt-1 text-xs text-gray-500">
            Not everyone at the event needs this service - set how
            many people it covers (max {MAX_PEOPLE_QUANTITY}).
          </p>

        </div>
      )}

      {/* Check-out date + room quantity (accommodation pricing) */}

      {isPerDay && (
        <div
          className={`mt-6 grid gap-4 ${
            showRooms ? "grid-cols-2" : "grid-cols-1"
          }`}
        >

          <div>
            <label className="font-medium flex items-center gap-2">
              <Calendar size={18} />
              Check-out Date
            </label>

            <input
              type="date"
              min={selectedDate || minDate}
              max={maxDate}
              className="w-full mt-2 border rounded-xl p-3"
              value={endDate || ""}
              onChange={(e) =>
                onEndDateChange?.(e.target.value)
              }
            />
          </div>

          {showRooms && (
            <div>
              <label className="font-medium">
                Rooms
              </label>

              <input
                type="number"
                min={1}
                className="w-full mt-2 border rounded-xl p-3"
                value={quantity ?? 1}
                onChange={(e) =>
                  onQuantityChange?.(
                    Math.max(1, Number(e.target.value))
                  )
                }
              />

              <p className="mt-1 text-xs text-gray-500">
                Auto-suggested from guest count - adjust if needed.
              </p>

              {!!totalRooms && (
                <p className="mt-1 text-xs text-[#16A34A] font-medium">
                  {totalRooms} room(s)/suite(s) available on this date
                </p>
              )}
            </div>
          )}

        </div>
      )}

      {/* Guests */}

      <div className="mt-6">

        <label className="font-medium flex items-center gap-2">

          <Users size={18} />

          Guests

        </label>

        <input
          type="number"
          min={1}
          placeholder="Number of guests"
          className="
          w-full
          mt-2
          border
          rounded-xl
          p-3
          "
          value={guestCount || ""}
          onChange={(e) =>
            onGuestChange(
              Number(e.target.value)
            )
          }
        />

      </div>

      {/* Notes */}

      <div className="mt-6">

        <label className="font-medium flex items-center gap-2">

          <FileText size={18} />

          Special Requests

        </label>

        <textarea
          rows={4}
          className="
          w-full
          mt-2
          border
          rounded-xl
          p-3
          "
          placeholder="Any special requirements..."
          value={notes}
          onChange={(e)=>
            onNotesChange(
              e.target.value
            )
          }
        />

      </div>

      {/* Price Summary */}

      <div
        className="
        mt-8
        border-t
        pt-6
        space-y-3
        "
      >

        <div className="flex justify-between">

          <span>Package</span>

          <span>

            ₹
            {price
              ? price.toLocaleString()
              : "--"}

          </span>

        </div>

        {fee > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Application Fee</span>
            <span>₹{fee.toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-lg">

          <span>Total</span>

          <span>

            ₹
            {price
              ? total.toLocaleString()
              : "--"}

          </span>

        </div>

      </div>

      {cancellationPolicy && (
        <div className="mt-6 bg-[#F8F6F2] border border-gray-200 rounded-xl p-4">
          <p className="font-medium text-sm text-[#1F2937]">
            Cancellation Policy
          </p>
          <p className="mt-1 text-xs text-gray-600 whitespace-pre-line">
            {cancellationPolicy}
          </p>
        </div>
      )}

      {isFreeUser && (
        <p className="mt-4 text-center text-xs text-[#182E6E] bg-[#F2F3F8] rounded-lg py-2 px-3">
          Free members pay a small application fee, added automatically
          to the payment below. Upgrade to a paid membership to skip
          it.
        </p>
      )}

      <button
        onClick={onBook}
        disabled={submitting}
        className="
        mt-8
        w-full
        bg-[#1E3A8A]
        hover:bg-[#182E6E]
        text-white
        py-4
        rounded-xl
        font-semibold
        text-lg
        transition
        disabled:opacity-60
        disabled:cursor-not-allowed
        "
      >

        {submitting ? "Processing..." : "Book Now & Pay"}

      </button>

      <p className="mt-2 text-center text-xs text-gray-500">
        You&apos;ll be asked to pay right after booking - no waiting
        for provider approval.
      </p>

      {onAddToCart && (
        <button
          onClick={onAddToCart}
          disabled={addedToCart}
          className="
          mt-3
          w-full
          border
          border-[#1E3A8A]
          text-[#1E3A8A]
          hover:bg-[#F8F6F2]
          py-4
          rounded-xl
          font-semibold
          text-lg
          transition
          disabled:opacity-60
          disabled:cursor-not-allowed
          "
        >
          {addedToCart ? "Added to Cart" : "Add to Cart"}
        </button>
      )}

    </div>
  );
}
