"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getAllBookings,
  getBookingStats,
  formatBookingDates,
  type Booking,
  type BookingStats,
} from "@/services/bookingApi";

function statusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-[#E0E4EF] text-[#182E6E]";
    case "REJECTED":
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
    return "Awaiting Payment";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const [bookingsData, statsData] = await Promise.all([
          getAllBookings(),
          getBookingStats(),
        ]);

        setBookings(bookingsData);
        setStats(statsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered =
    statusFilter === "ALL"
      ? bookings
      : bookings.filter((b) => b.booking_status === statusFilter);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        Loading bookings...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-[#1F2937]">
          Booking Management
        </h1>

        <div className="flex flex-wrap items-center gap-4">
          <p className="text-gray-500">
            {stats?.total_bookings ?? 0} total · ₹
            {(stats?.total_revenue ?? 0).toLocaleString("en-IN")} revenue
          </p>

          <Link
            href="/admin/dashboard"
            className="bg-[#1E3A8A] hover:bg-[#182E6E] text-white px-5 py-2.5 rounded-xl font-semibold transition whitespace-nowrap"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {[
          "ALL",
          "PENDING",
          "AWAITING_PAYMENT",
          "CONFIRMED",
          "REJECTED",
          "EXPIRED",
        ].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                statusFilter === status
                  ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                  : "bg-white hover:bg-[#F8F6F2]"
              }`}
            >
              {status === "ALL" ? "All" : statusLabel(status)}
            </button>
          )
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-gray-500">
          No bookings found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8F6F2] text-gray-600">
              <tr>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Provider</th>
                <th className="px-6 py-3 font-medium">Service</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Guests</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((booking) => (
                <tr key={booking.id} className="border-t">
                  <td className="px-6 py-4">
                    {booking.customer_name || "—"}
                  </td>

                  <td className="px-6 py-4">
                    {booking.provider_name || "—"}
                  </td>

                  <td className="px-6 py-4">
                    {booking.service_name || "—"}
                  </td>

                  <td className="px-6 py-4">
                    {formatBookingDates(booking)}
                    {booking.quantity && booking.quantity > 1
                      ? ` · ${booking.quantity} rooms`
                      : ""}
                  </td>

                  <td className="px-6 py-4">{booking.guest_count}</td>

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
                      {statusLabel(booking.booking_status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
  