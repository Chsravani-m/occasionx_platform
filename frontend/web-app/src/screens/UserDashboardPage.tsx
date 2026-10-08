import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/apiClient";
import { useToast } from "@/context/NotificationContext";

export interface BookingSummary {
  id: number;
  providerName: string;
  eventTitle: string;
  eventDate: string; // ISO
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "AUTO_REFUNDED";
  locationLabel: string;
  providerId?: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string; // ISO
}

export interface Rating {
  id: number;
  bookingId: number;
  providerId: number;
  ratingValue: number;
  reviewTitle?: string;
  reviewText?: string;
}

interface RatingDraft {
  bookingId: number;
  providerId: number;
  ratingValue: number;
  reviewTitle?: string;
  reviewText?: string;
}

const StatusTag: React.FC<{ status: BookingSummary["status"] }> = ({ status }) => {
  const color =
    status === "CONFIRMED"
      ? "bg-[#465A9C]/20 text-[#929EC4]"
      : status === "PENDING"
      ? "bg-yellow-500/20 text-yellow-300"
      : status === "COMPLETED"
      ? "bg-sky-500/20 text-sky-300"
      : status === "AUTO_REFUNDED"
      ? "bg-indigo-500/20 text-indigo-300"
      : "bg-rose-500/20 text-rose-300";
  return <span className={`ox-tag-status rounded-md px-2 py-1 text-xs ${color}`}>{status}</span>;
};

export const UserDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Guest");
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);

  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingDraft, setRatingDraft] = useState<RatingDraft | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Auth protection
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  // Load dashboard data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [bookingsRes, calendarRes, ratingsRes] = await Promise.allSettled([
          api.get("/users/me/bookings"),
          api.get("/users/me/calendar"),
          api.get("/ratings/my"),
        ]);

        if (cancelled) return;

        // derive userName from a hypothetical /auth/me if available in future
        setUserName(localStorage.getItem("userName") || "User");

        if (bookingsRes.status === "fulfilled") {
          const data = bookingsRes.value.data?.data ?? bookingsRes.value.data ?? [];
          setBookings(data as BookingSummary[]);
        } else {
          // mocked fallback
          setBookings([
            {
              id: 1,
              providerName: "Aria Events & Decor",
              eventTitle: "Wedding Reception",
              eventDate: new Date(Date.now() + 86400000).toISOString(),
              status: "CONFIRMED",
              locationLabel: "JW Marriott, Pune",
              providerId: 101,
            },
            {
              id: 2,
              providerName: "Lumina Photography",
              eventTitle: "Engagement Shoot",
              eventDate: new Date().toISOString(),
              status: "PENDING",
              locationLabel: "Cubbon Park, Bengaluru",
              providerId: 202,
            },
          ]);
        }

        if (calendarRes.status === "fulfilled") {
          const data = calendarRes.value.data?.data ?? calendarRes.value.data ?? [];
          setCalendarEvents(data as CalendarEvent[]);
        } else {
          setCalendarEvents([
            { id: 1, title: "Venue visit", date: new Date().toISOString() },
            { id: 2, title: "Decorator meeting", date: new Date(Date.now() + 2 * 86400000).toISOString() },
          ]);
        }

        if (ratingsRes.status === "fulfilled") {
          const data = ratingsRes.value.data?.data ?? ratingsRes.value.data ?? [];
          setRatings(data as Rating[]);
        } else {
          setRatings([]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = useMemo(
    () => bookings.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED"),
    [bookings]
  );
  const pastCompleted = useMemo(
    () => bookings.filter((b) => b.status === "COMPLETED"),
    [bookings]
  );

  const averageRating = useMemo(() => {
    if (!ratings.length) return undefined;
    const sum = ratings.reduce((acc, r) => acc + r.ratingValue, 0);
    return Number((sum / ratings.length).toFixed(1));
  }, [ratings]);

  const existingRatingForBooking = (bookingId: number) =>
    ratings.find((r) => r.bookingId === bookingId);

  const openRateModal = (b: BookingSummary) => {
    setRatingDraft({
      bookingId: b.id,
      providerId: b.providerId ?? 0,
      ratingValue: 5,
      reviewTitle: "",
      reviewText: "",
    });
    setRatingOpen(true);
  };

  const submitRating = async () => {
    if (!ratingDraft) return;
    try {
      setRatingSubmitting(true);
      await api.post("/ratings", ratingDraft);
      setRatings((prev) => [
        ...prev,
        {
          id: Math.floor(Math.random() * 100000),
          bookingId: ratingDraft.bookingId,
          providerId: ratingDraft.providerId,
          ratingValue: ratingDraft.ratingValue,
          reviewTitle: ratingDraft.reviewTitle,
          reviewText: ratingDraft.reviewText,
        },
      ]);
      setRatingOpen(false);
      setRatingDraft(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) {
    return <div className="ox-main ox-dashboard p-6 text-white">Loading dashboard…</div>;
  }

  if (error) {
    return (
      <div className="ox-main ox-dashboard p-6 text-white">
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4">{error}</div>
      </div>
    );
  }

  return (
    <main className="ox-main ox-dashboard mx-auto max-w-6xl px-4 py-6">
      {/* Section 1: Greeting + quick stats */}
      <section className="ox-section mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Hi, {userName}</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="ox-card rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
            <div className="ox-meta text-xs uppercase tracking-wide text-white/70">Upcoming Bookings</div>
            <div className="mt-2 text-2xl font-semibold">{upcoming.length}</div>
          </div>
          <div className="ox-card rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
            <div className="ox-meta text-xs uppercase tracking-wide text-white/70">Completed Events</div>
            <div className="mt-2 text-2xl font-semibold">{pastCompleted.length}</div>
          </div>
          <div className="ox-card rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
            <div className="ox-meta text-xs uppercase tracking-wide text-white/70">Average Rating</div>
            <div className="mt-2 text-2xl font-semibold">{averageRating ?? "—"}</div>
          </div>
        </div>
      </section>

      {/* Section 2: two columns */}
      <section className="ox-section grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left: Upcoming Bookings */}
        <div className="ox-card rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Bookings</h2>
            <button
              className="text-sm text-indigo-300 hover:text-indigo-200"
              onClick={() => navigate("/dashboard/bookings")}
            >
              View all
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {upcoming.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                className="flex items-center justify-between rounded-lg border border-white/15 bg-black/20 p-3 text-left text-white hover:bg-black/30"
              >
                <div>
                  <div className="font-medium">{b.eventTitle}</div>
                  <div className="text-xs text-white/70">
                    {new Date(b.eventDate).toLocaleString()} • {b.providerName}
                  </div>
                </div>
                <StatusTag status={b.status} />
              </button>
            ))}
            {!upcoming.length && (
              <div className="rounded-lg border border-white/15 bg-black/20 p-3 text-white/70">
                You have no bookings yet.
              </div>
            )}
          </div>
        </div>

        {/* Right: Calendar Snapshot */}
        <div className="ox-card rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Calendar Snapshot</h2>
            <button
              className="text-sm text-indigo-300 hover:text-indigo-200"
              onClick={() => navigate("/dashboard/calendar")}
            >
              Open calendar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {calendarEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between rounded-lg border border-white/15 bg-black/20 p-3">
                <div className="text-white">{ev.title}</div>
                <div className="text-sm text-white/70">{new Date(ev.date).toLocaleDateString()}</div>
              </div>
            ))}
            {!calendarEvents.length && (
              <div className="rounded-lg border border-white/15 bg-black/20 p-3 text-white/70">
                No calendar events.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Past Bookings & Ratings */}
      <section className="ox-section mt-6">
        <div className="ox-card rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
          <h2 className="mb-3 text-lg font-semibold">Past Bookings & Ratings</h2>
          <div className="flex flex-col gap-3">
            {pastCompleted.map((b) => {
              const existing = existingRatingForBooking(b.id);
              return (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-white/15 bg-black/20 p-3">
                  <div>
                    <div className="font-medium">{b.eventTitle}</div>
                    <div className="text-xs text-white/70">
                      {new Date(b.eventDate).toLocaleString()} • {b.providerName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {existing ? (
                      <span className="text-sm text-white/80">⭐ {existing.ratingValue}</span>
                    ) : (
                      <button
                        className="rounded-lg bg-indigo-500 px-3 py-1 text-sm text-white hover:bg-indigo-600"
                        onClick={() => openRateModal(b)}
                      >
                        Rate
                      </button>
                    )}
                    <button
                      className="rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
                      onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
            {!pastCompleted.length && (
              <div className="rounded-lg border border-white/15 bg-black/20 p-3 text-white/70">
                No past bookings yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Rating Modal */}
      {ratingOpen && ratingDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRatingOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white/10 p-5 text-white ring-1 ring-white/20 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Rate your experience</h3>
              <button
                className="rounded-md px-2 py-1 text-white/80 hover:bg-white/10"
                onClick={() => setRatingOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm text-white/80">Rating</label>
                <select
                  value={ratingDraft.ratingValue}
                  onChange={(e) =>
                    setRatingDraft({ ...ratingDraft, ratingValue: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-white/20 bg-black/20 p-2 text-white focus:border-white/40 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v} className="bg-gray-900">
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/80">Review Title (optional)</label>
                <input
                  type="text"
                  value={ratingDraft.reviewTitle || ""}
                  onChange={(e) => setRatingDraft({ ...ratingDraft, reviewTitle: e.target.value })}
                  className="w-full rounded-md border border-white/20 bg-black/20 p-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
                  placeholder="e.g., Wonderful decor and seamless coordination"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/80">Review Text</label>
                <textarea
                  rows={4}
                  value={ratingDraft.reviewText || ""}
                  onChange={(e) => setRatingDraft({ ...ratingDraft, reviewText: e.target.value })}
                  className="w-full rounded-md border border-white/20 bg-black/20 p-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
                  placeholder="Share details about your experience"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
                onClick={() => setRatingOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
                disabled={ratingSubmitting}
                onClick={submitRating}
              >
                {ratingSubmitting ? "Submitting…" : "Submit Rating"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default UserDashboardPage;

