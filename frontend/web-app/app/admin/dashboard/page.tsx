"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getAllBookings,
  getBookingStats,
  type Booking,
  type BookingStats,
} from "@/services/bookingApi";

import {
  getReviewStats,
  type ReviewStats,
} from "@/services/reviewApi";

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminDashboardPage() {
  const [bookingStats, setBookingStats] =
    useState<BookingStats | null>(null);

  const [recentBookings, setRecentBookings] =
    useState<Booking[]>([]);

  const [reviewStats, setReviewStats] =
    useState<ReviewStats | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [
          bookingStatsData,
          allBookingsData,
          reviewStatsData,
        ] = await Promise.all([
          getBookingStats(),
          getAllBookings(5),
          getReviewStats(),
        ]);

        setBookingStats(bookingStatsData);
        setRecentBookings(allBookingsData);
        setReviewStats(reviewStatsData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">

      <div
          className="
            rounded-3xl
            bg-gradient-to-r
            from-[#1E3A8A]
            to-[#18285A]
            text-white
            p-10
          "
        >
          <h1 className="text-4xl font-bold">
            Welcome Back 👋
          </h1>

          <p className="mt-3 text-white/80">
            Monitor providers, bookings,
            packages and platform growth.
          </p>
        </div>

      {/* Quick Actions */}

<div className="mt-10">

  <div className="flex items-center justify-between mb-6">

    <h2 className="text-2xl font-bold text-[#1F2937]">
      Quick Actions
    </h2>

    <span className="text-gray-500">
      Frequently used admin tools
    </span>

  </div>

  <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">

    <Link
      href="/admin/providers"
      className="
        group
        bg-white
        rounded-3xl
        border
        border-gray-100
        p-6
        shadow-sm
        hover:shadow-xl
        hover:-translate-y-1
        transition-all
      "
    >
      <div className="text-4xl">
        🏢
      </div>

      <h3 className="mt-4 text-lg font-semibold text-[#1F2937]">
        Provider Details
      </h3>

      <p className="text-gray-500 mt-2">
        View all registered providers and their documents.
      </p>

      <div
        className="
          mt-4
          text-[#5B756D]
          font-medium
        "
      >
        Open →
      </div>
    </Link>

    <Link
      href="/admin/packages"
      className="
        group
        bg-white
        rounded-3xl
        border
        border-gray-100
        p-6
        shadow-sm
        hover:shadow-xl
        hover:-translate-y-1
        transition-all
      "
    >
      <div className="text-4xl">
        📦
      </div>

      <h3 className="mt-4 text-lg font-semibold text-[#1F2937]">
        Package Builder
      </h3>

      <p className="text-gray-500 mt-2">
        Create wedding, birthday and corporate event packages.
      </p>

      <div
        className="
          mt-4
          text-[#5B756D]
          font-medium
        "
      >
        Open →
      </div>
    </Link>

    <Link
      href="/admin/master-data/locations"
      className="
        group
        bg-white
        rounded-3xl
        border
        border-gray-100
        p-6
        shadow-sm
        hover:shadow-xl
        hover:-translate-y-1
        transition-all
      "
    >
      <div className="text-4xl">
        📍
      </div>

      <h3 className="mt-4 text-lg font-semibold text-[#1F2937]">
        Location Management
      </h3>

      <p className="text-gray-500 mt-2">
        Manage states, districts and locations.
      </p>

      <div
        className="
          mt-4
          text-[#5B756D]
          font-medium
        "
      >
        Open →
      </div>
    </Link>

    <Link
      href="/admin/categories"
      className="
        group
        bg-white
        rounded-3xl
        border
        border-gray-100
        p-6
        shadow-sm
        hover:shadow-xl
        hover:-translate-y-1
        transition-all
      "
    >
      <div className="text-4xl">
        📂
      </div>

      <h3 className="mt-4 text-lg font-semibold text-[#1F2937]">
        Categories
      </h3>

      <p className="text-gray-500 mt-2">
        Manage categories and subcategories.
      </p>

      <div
        className="
          mt-4
          text-[#5B756D]
          font-medium
        "
      >
        Open →
      </div>
    </Link>

    <Link
      href="/admin/event-types"
      className="
        group
        bg-white
        rounded-3xl
        border
        border-gray-100
        p-6
        shadow-sm
        hover:shadow-xl
        hover:-translate-y-1
        transition-all
      "
    >
      <div className="text-4xl">
        🎉
      </div>

      <h3 className="mt-4 text-lg font-semibold text-[#1F2937]">
        Event Types
      </h3>

      <p className="text-gray-500 mt-2">
        Configure supported event types.
      </p>

      <div
        className="
          mt-4
          text-[#5B756D]
          font-medium
        "
      >
        Open →
      </div>
    </Link>

    <Link
      href="/admin/bookings"
      className="
        group
        bg-white
        rounded-3xl
        border
        border-gray-100
        p-6
        shadow-sm
        hover:shadow-xl
        hover:-translate-y-1
        transition-all
      "
    >
      <div className="text-4xl">
        📅
      </div>

      <h3 className="mt-4 text-lg font-semibold text-[#1F2937]">
        Booking Management
      </h3>

      <p className="text-gray-500 mt-2">
        View and manage platform bookings.
      </p>

      <div
        className="
          mt-4
          text-[#5B756D]
          font-medium
        "
      >
        Open →
      </div>
    </Link>

  </div>

</div>
      {/* Platform Overview */}

<div className="mt-10">

  <div className="flex items-center justify-between mb-6">

    <h2 className="text-2xl font-bold text-[#1F2937]">
      Platform Overview
    </h2>

    <span className="text-gray-500">
      Real-time business metrics
    </span>

  </div>

  <div className="grid lg:grid-cols-3 gap-6">

    <div
      className="
        bg-white
        rounded-3xl
        p-8
        shadow-sm
        border
      "
    >
      <div className="text-4xl">
        💰
      </div>

      <h3 className="mt-4 text-lg font-semibold">
        Revenue
      </h3>

      <div className="text-4xl font-bold mt-4 text-[#1F2937]">
        ₹{(bookingStats?.total_revenue ?? 0).toLocaleString("en-IN")}
      </div>

      <p className="text-gray-500 mt-2">
        From confirmed bookings
      </p>
    </div>

    <div
      className="
        bg-white
        rounded-3xl
        p-8
        shadow-sm
        border
      "
    >
      <div className="text-4xl">
        📅
      </div>

      <h3 className="mt-4 text-lg font-semibold">
        Bookings
      </h3>

      <div className="text-4xl font-bold mt-4 text-[#1F2937]">
        {bookingStats?.total_bookings ?? 0}
      </div>

      <p className="text-gray-500 mt-2">
        {bookingStats?.pending_bookings ?? 0} pending ·{" "}
        {bookingStats?.confirmed_bookings ?? 0} confirmed
      </p>
    </div>

    <div
      className="
        bg-white
        rounded-3xl
        p-8
        shadow-sm
        border
      "
    >
      <div className="text-4xl">
        ⭐
      </div>

      <h3 className="mt-4 text-lg font-semibold">
        Reviews
      </h3>

      <div className="text-4xl font-bold mt-4 text-[#1F2937]">
        {(reviewStats?.average_rating ?? 0).toFixed(1)} ★
      </div>

      <p className="text-gray-500 mt-2">
        {reviewStats?.total_reviews ?? 0} review
        {reviewStats?.total_reviews === 1 ? "" : "s"} across the platform
      </p>
    </div>

  </div>

</div>
    {/* Recent Activity */}

<div className="mt-10">

  <div className="bg-white rounded-3xl border shadow-sm p-8">

    <div className="flex items-center justify-between">

      <h2 className="text-2xl font-bold text-[#1F2937]">
        Recent Activity
      </h2>

      <Link
        href="/admin/bookings"
        className="text-[#5B756D]"
      >
        View All →
      </Link>

    </div>

    <div className="mt-6 space-y-4">

      {recentBookings.length === 0 && (
        <p className="text-gray-500">
          No bookings yet.
        </p>
      )}

      {recentBookings.map((booking) => {
        const statusIcon =
          booking.booking_status === "CONFIRMED"
            ? "✅"
            : booking.booking_status === "REJECTED"
            ? "❌"
            : "🕐";

        const statusBg =
          booking.booking_status === "CONFIRMED"
            ? "bg-green-100"
            : booking.booking_status === "REJECTED"
            ? "bg-red-100"
            : "bg-yellow-100";

        return (
          <div
            key={booking.id}
            className="flex items-center gap-4"
          >
            <div
              className={`h-10 w-10 rounded-full ${statusBg} flex items-center justify-center`}
            >
              {statusIcon}
            </div>

            <div>
              <p className="font-medium">
                {booking.service_name || "Service"} booked
                {booking.customer_name
                  ? ` by ${booking.customer_name}`
                  : ""}
              </p>

              <p className="text-sm text-gray-500">
                {timeAgo(booking.created_at)}
              </p>
            </div>

          </div>
        );
      })}

    </div>

  </div>

</div>
    </div>
  );
}