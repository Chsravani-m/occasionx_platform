"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  getBookingPolicy,
  updateBookingPolicy,
} from "@/services/providerBookingPolicyApi";

export default function ProviderBookingPolicyPage() {
  const router = useRouter();

  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // The backend only stores hours (booking_notice_hours) - a provider
  // needing "10 days notice" shouldn't have to do the ×24 math
  // themselves, so this lets them enter either unit and converts
  // under the hood.
  const [noticeUnit, setNoticeUnit] = useState<"hours" | "days">("hours");
  const [noticeValue, setNoticeValue] = useState("6");
  const [cancellationPolicy, setCancellationPolicy] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("provider_id");

    if (!id) {
      router.push("/provider/login");
      return;
    }

    setProviderId(id);

    getBookingPolicy(id)
      .then((policy) => {
        const hours = policy.booking_notice_hours ?? 6;
        // Default to whichever unit displays as a clean whole number,
        // so e.g. a saved 240 shows as "10 days" not "240 hours".
        if (hours >= 24 && hours % 24 === 0) {
          setNoticeUnit("days");
          setNoticeValue(String(hours / 24));
        } else {
          setNoticeUnit("hours");
          setNoticeValue(String(hours));
        }
        setCancellationPolicy(policy.cancellation_policy || "");
      })
      .catch((err) => {
        console.error(err);
        setError("Couldn't load your booking policy. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const parsedValue = Number(noticeValue);
  const computedHours =
    Number.isFinite(parsedValue) && parsedValue >= 0
      ? Math.round(noticeUnit === "days" ? parsedValue * 24 : parsedValue)
      : null;

  const switchUnit = (unit: "hours" | "days") => {
    if (unit === noticeUnit) return;
    if (computedHours !== null) {
      setNoticeValue(
        unit === "days" ? String(computedHours / 24) : String(computedHours)
      );
    }
    setNoticeUnit(unit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!providerId) return;

    if (computedHours === null) {
      setError(`Enter a valid number of ${noticeUnit} (0 or more).`);
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await updateBookingPolicy(providerId, {
        booking_notice_hours: computedHours,
        cancellation_policy: cancellationPolicy.trim() || null,
      });

      setSuccess("Booking policy saved.");
    } catch (err) {
      console.error(err);
      setError("Couldn't save your booking policy. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading your booking policy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Link
          href="/provider/dashboard"
          className="text-sm font-medium text-[#182E6E]"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-4 bg-white border border-[#E5E7EB] rounded-3xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-[#1F2937]">
            Booking Policy
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            You decide how much notice customers must give before booking
            you, and your own cancellation terms - both are shown on your
            profile before a customer books. For example, with 6
            hours&apos; notice a customer must book at least 6 hours before
            the event&apos;s start time; with 10 days&apos; notice, at
            least 10 days before.
          </p>

          {error && (
            <div className="mt-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-3">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded-lg px-3 py-3">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#1F2937]">
                Minimum Booking Notice
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className="flex-1 rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                  placeholder={noticeUnit === "days" ? "e.g. 10" : "e.g. 6"}
                  value={noticeValue}
                  onChange={(e) => setNoticeValue(e.target.value)}
                />
                <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => switchUnit("hours")}
                    className={`px-3 py-2 text-sm font-medium transition ${
                      noticeUnit === "hours"
                        ? "bg-[#1E3A8A] text-white"
                        : "bg-[#FFFCF8] text-[#1F2937]"
                    }`}
                  >
                    Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => switchUnit("days")}
                    className={`px-3 py-2 text-sm font-medium transition ${
                      noticeUnit === "days"
                        ? "bg-[#1E3A8A] text-white"
                        : "bg-[#FFFCF8] text-[#1F2937]"
                    }`}
                  >
                    Days
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                How much advance notice a customer must give before the
                event, in whichever unit is easier to think in.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-[#1F2937]">
                Cancellation Policy
              </label>
              <textarea
                rows={5}
                className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                placeholder="e.g. Cancellations are accepted up to 24 hours before the event for a full refund. No refund after that."
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">
                Shown to customers before they book. This is informational -
                OccasionX doesn&apos;t automatically enforce refund terms.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-[#1E3A8A] hover:bg-[#182E6E] text-white text-sm font-semibold py-2.5 mt-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Booking Policy"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
