"use client";

import { useEffect, useState } from "react";

import {
  getProviderBookings,
  type Booking,
} from "@/services/bookingApi";
import {
  getProviderEarnings,
  type ProviderEarnings,
} from "@/services/earningsApi";

function statusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "PAID":
      return "bg-[#E0E4EF] text-[#182E6E]";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "EXPIRED":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function formatMonth(month: string) {
  const [year, monthNum] = month.split("-").map(Number);

  return new Date(year, monthNum - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

export default function ProviderEarningsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState<ProviderEarnings | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("provider_id");

    if (!id) {
      setLoading(false);
      return;
    }

    Promise.all([
      getProviderBookings(id),
      getProviderEarnings(id),
    ])
      .then(([bookingsData, earningsData]) => {
        setBookings(bookingsData);
        setEarnings(earningsData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const maxMonthlyEarnings = Math.max(
    1,
    ...(earnings?.monthly.map((m) => m.earnings) ?? [0])
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        Loading earnings...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div>
        <h1 className="text-4xl font-bold text-[#1F2937]">
          Earnings
        </h1>

        <p className="mt-2 text-gray-600">
          Revenue from your confirmed bookings. OccasionX doesn&apos;t
          take a commission - this is 100% yours.
        </p>
      </div>

      <div className="grid gap-6 mt-8 md:grid-cols-4">
        <div className="rounded-3xl bg-white border shadow-sm p-6">
          <p className="text-gray-500">Total Earnings</p>

          <h2 className="text-3xl font-bold mt-2 text-[#1E3A8A]">
            ₹{(earnings?.total_earnings ?? 0).toLocaleString("en-IN")}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            From confirmed bookings
          </p>
        </div>

        <div className="rounded-3xl bg-white border shadow-sm p-6">
          <p className="text-gray-500">Confirmed Bookings</p>

          <h2 className="text-3xl font-bold mt-2 text-[#1F2937]">
            {earnings?.confirmed_bookings ?? 0}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            All time
          </p>
        </div>

        <div className="rounded-3xl bg-white border shadow-sm p-6">
          <p className="text-gray-500">Average Booking Value</p>

          <h2 className="text-3xl font-bold mt-2 text-[#1F2937]">
            ₹
            {(earnings?.average_booking_value ?? 0).toLocaleString(
              "en-IN"
            )}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Per confirmed booking
          </p>
        </div>

        <div className="rounded-3xl bg-white border shadow-sm p-6">
          <p className="text-gray-500">Awaiting Payment</p>

          <h2 className="text-3xl font-bold mt-2 text-amber-600">
            ₹
            {(earnings?.awaiting_payment_amount ?? 0).toLocaleString(
              "en-IN"
            )}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            {earnings?.awaiting_payment_count ?? 0} booking
            {earnings?.awaiting_payment_count === 1 ? "" : "s"} pending
            payment
          </p>
        </div>
      </div>

      {!!earnings?.offline_bookings && (
        <div className="mt-6 rounded-3xl bg-white border shadow-sm p-6">
          <p className="text-gray-500">
            Offline Bookings (your own record-keeping)
          </p>

          <h2 className="text-2xl font-bold mt-2 text-[#1F2937]">
            ₹{earnings.offline_earnings.toLocaleString("en-IN")}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            {earnings.offline_bookings} job
            {earnings.offline_bookings === 1 ? "" : "s"} logged outside
            OccasionX - not included in Total Earnings above.
          </p>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4">
          Earnings by Month
        </h2>

        <div className="rounded-3xl border bg-white shadow-sm p-6 space-y-4">
          {earnings?.monthly.map((entry) => (
            <div key={entry.month}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-[#1F2937]">
                  {formatMonth(entry.month)}
                </span>

                <span className="text-gray-500">
                  ₹{entry.earnings.toLocaleString("en-IN")} ·{" "}
                  {entry.bookings} booking
                  {entry.bookings === 1 ? "" : "s"}
                </span>
              </div>

              <div className="h-2.5 rounded-full bg-[#F8F6F2] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1E3A8A]"
                  style={{
                    width: `${Math.max(
                      2,
                      (entry.earnings / maxMonthlyEarnings) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4">
          Booking History
        </h2>

        {bookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-gray-500">
            No bookings yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F6F2] text-gray-600">
                <tr>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Service</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-t">
                    <td className="px-6 py-4">
                      {booking.customer_name || "—"}
                    </td>

                    <td className="px-6 py-4">
                      {booking.service_name || "—"}
                    </td>

                    <td className="px-6 py-4">{booking.event_date}</td>

                    <td className="px-6 py-4">
                      {booking.amount
                        ? `₹${booking.amount.toLocaleString("en-IN")}`
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(
                          booking.booking_status
                        )}`}
                      >
                        {booking.booking_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
