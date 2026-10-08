"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCustomerBookings,
  type Booking,
} from "@/services/bookingApi";
import { getCurrentUser } from "@/utils/auth";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function statusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-[#E0E4EF] text-[#182E6E]";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function BookingRow({ booking }: { booking: Booking }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow">
      <div>
        <p className="font-semibold text-[#1F2937]">
          {booking.service_name || "Service"}
          {booking.provider_name ? ` — ${booking.provider_name}` : ""}
        </p>

        <p className="text-sm text-[#5B756D]">
          {booking.event_date} · {booking.guest_count} guests
        </p>
      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(
          booking.booking_status
        )}`}
      >
        {booking.booking_status}
      </span>
    </div>
  );
}

export default function MyCalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const user = getCurrentUser();

        if (!user?.id) {
          setError("Please log in to view your calendar.");
          return;
        }

        const data = await getCustomerBookings(user.id);
        setBookings(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load your bookings.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();

    bookings.forEach((booking) => {
      const key = booking.event_date;
      const list = map.get(key) || [];
      list.push(booking);
      map.set(key, list);
    });

    return map;
  }, [bookings]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const selectedBookings = selectedKey
    ? bookingsByDate.get(selectedKey) || []
    : [];

  // Split into upcoming vs past instead of one mixed list, so
  // CONFIRMED/EXPIRED bookings from months ago don't bury what's
  // actually coming up.
  const todayKey = toDateKey(new Date());

  const upcomingBookings = useMemo(
    () =>
      [...bookings]
        .filter((b) => b.event_date >= todayKey)
        .sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [bookings, todayKey]
  );

  const pastBookings = useMemo(
    () =>
      [...bookings]
        .filter((b) => b.event_date < todayKey)
        .sort((a, b) => b.event_date.localeCompare(a.event_date)),
    [bookings, todayKey]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] p-8">
        Loading your calendar...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-[#1F2937]">
          My Calendar
        </h1>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {!error && (
          <>
            <div className="rounded-3xl bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() =>
                    setCursor(new Date(year, month - 1, 1))
                  }
                  className="rounded-lg border px-3 py-1 text-[#1F2937] hover:bg-[#F8F6F2]"
                >
                  ← Prev
                </button>

                <h2 className="text-lg font-semibold text-[#1F2937]">
                  {MONTH_NAMES[month]} {year}
                </h2>

                <button
                  onClick={() =>
                    setCursor(new Date(year, month + 1, 1))
                  }
                  className="rounded-lg border px-3 py-1 text-[#1F2937] hover:bg-[#F8F6F2]"
                >
                  Next →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[#5B756D]">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, index) => {
                  if (!date) {
                    return <div key={`blank-${index}`} />;
                  }

                  const key = toDateKey(date);
                  const dayBookings = bookingsByDate.get(key) || [];
                  const hasBookings = dayBookings.length > 0;
                  const isSelected = selectedKey === key;

                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setSelectedKey(isSelected ? null : key)
                      }
                      className={`flex h-16 flex-col items-center justify-start rounded-lg p-1 text-sm transition ${
                        isSelected
                          ? "bg-[#1E3A8A] text-white"
                          : hasBookings
                          ? "bg-[#F2F3F8] text-[#1F2937] hover:bg-[#E0E4EF]"
                          : "text-[#1F2937] hover:bg-[#F8F6F2]"
                      }`}
                    >
                      <span>{date.getDate()}</span>

                      {hasBookings && (
                        <span
                          className={`mt-1 h-1.5 w-1.5 rounded-full ${
                            isSelected ? "bg-white" : "bg-[#1E3A8A]"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedKey ? (
              <div className="mt-6">
                <h3 className="mb-3 text-lg font-semibold text-[#1F2937]">
                  Bookings on {selectedKey}
                </h3>

                <div className="space-y-3">
                  {selectedBookings.length === 0 && (
                    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-[#5B756D]">
                      No bookings to show.
                    </div>
                  )}

                  {selectedBookings.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <h3 className="mb-3 text-lg font-semibold text-[#1F2937]">
                    Upcoming Bookings
                  </h3>

                  <div className="space-y-3">
                    {upcomingBookings.length === 0 && (
                      <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-[#5B756D]">
                        No upcoming bookings.
                      </div>
                    )}

                    {upcomingBookings.map((booking) => (
                      <BookingRow key={booking.id} booking={booking} />
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="mb-3 text-lg font-semibold text-[#1F2937]">
                    Past Bookings
                  </h3>

                  <div className="space-y-3">
                    {pastBookings.length === 0 && (
                      <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-[#5B756D]">
                        No past bookings.
                      </div>
                    )}

                    {pastBookings.map((booking) => (
                      <BookingRow key={booking.id} booking={booking} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
