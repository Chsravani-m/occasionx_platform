"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getProviderBookingsPaged,
  updateBookingStatus,
  createOfflineBooking,
  formatBookingDates,
  type Booking,
  type OfflineBookingPayload,
} from "@/services/bookingApi";

import { getProviderDetails } from "@/services/providerDetailsApi";

const PAGE_SIZE = 10;

interface SellerInfo {
  business_name: string;
  phone?: string;
  email?: string;
  address?: string;
}

const emptyOfflineForm = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  serviceName: "",
  eventDate: "",
  endDate: "",
  paymentDate: "",
  amount: "",
  paymentMethod: "Cash",
  paymentType: "FULL" as "FULL" | "ADVANCE",
  amountPaid: "",
  guestCount: "",
  notes: "",
};

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Other"];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildEmailShareHref(
  booking: Booking,
  seller: SellerInfo | null
): string {
  const sellerName = seller?.business_name || "OccasionX Provider";
  const subject = "Bill from " + sellerName;
  const total = (booking.amount ?? 0).toLocaleString("en-IN");

  const bodyLines = [
    "Hi " + (booking.customer_name || "") + ",",
    "",
    "Here is your bill for " +
      (booking.service_name || "the service") +
      " on " +
      formatBookingDates(booking) +
      ".",
    "",
    "Total: Rs. " + total,
    "",
    "Thank you,",
    sellerName,
  ];

  const body = bodyLines.join("\n");

  return (
    "mailto:" +
    (booking.customer_email || "") +
    "?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body)
  );
}

function buildWhatsappShareHref(
  booking: Booking,
  seller: SellerInfo | null
): string {
  const sellerName = seller?.business_name || "OccasionX";
  const phone = (booking.customer_phone || "").replace(/\D/g, "");
  const total = (booking.amount ?? 0).toLocaleString("en-IN");

  const text =
    "Hi " +
    (booking.customer_name || "") +
    ", here is your bill from " +
    sellerName +
    " for " +
    (booking.service_name || "the service") +
    " on " +
    formatBookingDates(booking) +
    ". Total: Rs. " +
    total +
    ". Thank you!";

  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
}

export default function ProviderBookingsPage() {

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [seller, setSeller] = useState<SellerInfo | null>(null);

  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineForm, setOfflineForm] = useState(emptyOfflineForm);
  const [submittingOffline, setSubmittingOffline] = useState(false);

  const [billBooking, setBillBooking] = useState<Booking | null>(null);

  const todayKey = toDateKey(new Date());

  async function loadBookings(targetPage: number) {

    try {

      setLoading(true);

      const providerId =
        localStorage.getItem("provider_id");

      if (!providerId) return;

      const data = await getProviderBookingsPaged(
        providerId,
        targetPage,
        PAGE_SIZE
      );

      setBookings(data.items);
      setPage(data.page);
      setTotalPages(data.total_pages);
      setTotal(data.total);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  }

  useEffect(() => {
    loadBookings(1);

    const providerId = localStorage.getItem("provider_id");

    if (providerId) {
      getProviderDetails(providerId)
        .then((data) =>
          setSeller({
            business_name: data.provider.business_name,
            phone: data.provider.phone,
            email: data.provider.email,
            address: data.provider.address,
          })
        )
        .catch((err) => console.error(err));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStatusUpdate(
    bookingId: string,
    status: string
  ) {

    try {

      await updateBookingStatus(
        bookingId,
        status
      );

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                booking_status: status,
              }
            : booking
        )
      );

    } catch (err) {

      console.error(err);

      alert("Unable to update booking");

    }
  }

  async function handleCreateOffline() {

    if (
      !offlineForm.customerName ||
      !offlineForm.customerPhone ||
      !offlineForm.serviceName ||
      !offlineForm.eventDate ||
      !offlineForm.amount
    ) {
      alert(
        "Customer name, phone number, service description, booked date and amount are required."
      );
      return;
    }

    if (Number(offlineForm.amount) <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    if (
      offlineForm.paymentType === "ADVANCE" &&
      Number(offlineForm.amountPaid) > Number(offlineForm.amount)
    ) {
      alert("Advance paid can't be more than the total amount.");
      return;
    }

    const providerId = localStorage.getItem("provider_id");

    if (!providerId) return;

    const payload: OfflineBookingPayload = {
      customer_name: offlineForm.customerName,
      customer_phone: offlineForm.customerPhone,
      customer_email: offlineForm.customerEmail || undefined,
      service_name: offlineForm.serviceName,
      event_date: offlineForm.eventDate,
      event_end_date: offlineForm.endDate || undefined,
      payment_date: offlineForm.paymentDate || undefined,
      amount: Number(offlineForm.amount),
      payment_method: offlineForm.paymentMethod || undefined,
      payment_type: offlineForm.paymentType,
      amount_paid:
        offlineForm.paymentType === "ADVANCE" && offlineForm.amountPaid
          ? Number(offlineForm.amountPaid)
          : undefined,
      guest_count: offlineForm.guestCount
        ? Number(offlineForm.guestCount)
        : undefined,
      notes: offlineForm.notes || undefined,
    };

    try {

      setSubmittingOffline(true);

      const created = await createOfflineBooking(providerId, payload);

      setOfflineForm(emptyOfflineForm);
      setShowOfflineForm(false);
      setBillBooking(created);

      await loadBookings(1);

    } catch (err) {

      console.error(err);

      alert("Unable to save this booking. Please try again.");

    } finally {

      setSubmittingOffline(false);

    }
  }

  function statusText(booking: Booking) {
    if (booking.source === "OFFLINE") {
      return booking.booking_status === "REJECTED"
        ? "Cancelled"
        : "Offline record";
    }

    if (booking.booking_status === "AWAITING_PAYMENT") {
      return "Awaiting customer payment";
    }

    if (booking.booking_status === "EXPIRED") {
      return "Expired - customer didn't complete payment";
    }

    return booking.booking_status;
  }

  if (loading && bookings.length === 0) {
    return (
      <div className="p-8">
        Loading bookings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] p-8">

      <div className="no-print">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold">
              Booking Requests
            </h1>

            <p className="text-gray-500 mt-1">
              {total} total bookings
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <Link
              href="/provider/dashboard"
              className="border border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#F8F6F2] px-5 py-3 rounded-xl font-semibold transition whitespace-nowrap"
            >
              Go to Dashboard
            </Link>

            <button
              onClick={() => setShowOfflineForm((prev) => !prev)}
              className="bg-[#1E3A8A] hover:bg-[#182E6E] text-white px-5 py-3 rounded-xl font-semibold whitespace-nowrap"
            >
              {showOfflineForm ? "Cancel" : "+ Log Offline Booking"}
            </button>

          </div>

        </div>

        {showOfflineForm && (
          <div className="bg-white rounded-3xl shadow mb-8 p-8">

            <h2 className="text-xl font-semibold mb-2">
              Log an Offline Booking
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              For a job you did outside OccasionX. This blocks the
              date on your calendar and lets you print a bill for it -
              it doesn&apos;t affect the platform&apos;s revenue or
              take any commission.
            </p>

            <div className="grid md:grid-cols-2 gap-4">

              <input
                value={offlineForm.customerName}
                onChange={(e) =>
                  setOfflineForm((prev) => ({
                    ...prev,
                    customerName: e.target.value,
                  }))
                }
                placeholder="Customer Name *"
                className="w-full border rounded-xl p-3"
              />

              <input
                value={offlineForm.customerPhone}
                onChange={(e) =>
                  setOfflineForm((prev) => ({
                    ...prev,
                    customerPhone: e.target.value,
                  }))
                }
                placeholder="Customer Phone *"
                className="w-full border rounded-xl p-3"
              />

              <input
                value={offlineForm.customerEmail}
                onChange={(e) =>
                  setOfflineForm((prev) => ({
                    ...prev,
                    customerEmail: e.target.value,
                  }))
                }
                placeholder="Customer Email"
                className="w-full border rounded-xl p-3"
              />

              <input
                value={offlineForm.serviceName}
                onChange={(e) =>
                  setOfflineForm((prev) => ({
                    ...prev,
                    serviceName: e.target.value,
                  }))
                }
                placeholder="Service Description *"
                className="w-full border rounded-xl p-3"
              />

              <div>
                <label className="text-sm text-gray-600">
                  Booked Date *
                </label>

                <input
                  type="date"
                  min={todayKey}
                  value={offlineForm.eventDate}
                  onChange={(e) =>
                    setOfflineForm((prev) => ({
                      ...prev,
                      eventDate: e.target.value,
                    }))
                  }
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  End Date (optional)
                </label>

                <input
                  type="date"
                  min={offlineForm.eventDate || todayKey}
                  value={offlineForm.endDate}
                  onChange={(e) =>
                    setOfflineForm((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Payment Date
                </label>

                <input
                  type="date"
                  min={todayKey}
                  max={todayKey}
                  value={offlineForm.paymentDate}
                  onChange={(e) =>
                    setOfflineForm((prev) => ({
                      ...prev,
                      paymentDate: e.target.value,
                    }))
                  }
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <input
                type="number"
                value={offlineForm.amount}
                onChange={(e) =>
                  setOfflineForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                placeholder="Amount (₹) *"
                className="w-full border rounded-xl p-3"
              />

              <input
                type="number"
                value={offlineForm.guestCount}
                onChange={(e) =>
                  setOfflineForm((prev) => ({
                    ...prev,
                    guestCount: e.target.value,
                  }))
                }
                placeholder="Guests (optional)"
                className="w-full border rounded-xl p-3"
              />

              <div>
                <label className="text-sm text-gray-600">
                  Payment Method
                </label>

                <select
                  value={offlineForm.paymentMethod}
                  onChange={(e) =>
                    setOfflineForm((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value,
                    }))
                  }
                  className="w-full border rounded-xl p-3"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Payment Type
                </label>

                <select
                  value={offlineForm.paymentType}
                  onChange={(e) =>
                    setOfflineForm((prev) => ({
                      ...prev,
                      paymentType: e.target.value as "FULL" | "ADVANCE",
                    }))
                  }
                  className="w-full border rounded-xl p-3"
                >
                  <option value="FULL">Full Payment</option>
                  <option value="ADVANCE">Advance Payment</option>
                </select>
              </div>

              {offlineForm.paymentType === "ADVANCE" && (
                <input
                  type="number"
                  value={offlineForm.amountPaid}
                  onChange={(e) =>
                    setOfflineForm((prev) => ({
                      ...prev,
                      amountPaid: e.target.value,
                    }))
                  }
                  placeholder="Amount Paid So Far (₹) *"
                  className="w-full border rounded-xl p-3"
                />
              )}

              <textarea
                value={offlineForm.notes}
                onChange={(e) =>
                  setOfflineForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Notes (optional)"
                rows={3}
                className="w-full border rounded-xl p-3 md:col-span-2"
              />

            </div>

            <button
              onClick={handleCreateOffline}
              disabled={submittingOffline}
              className="mt-6 bg-[#1E3A8A] hover:bg-[#182E6E] text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-60"
            >
              {submittingOffline ? "Saving..." : "Save Booking"}
            </button>

          </div>
        )}

        <div className="space-y-4">

          {bookings.length === 0 && (
            <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-gray-500">
              No bookings yet.
            </div>
          )}

          {bookings.map((booking) => (

            <div
              key={booking.id}
              className="bg-white rounded-2xl p-6 shadow"
            >

              <div className="flex items-start justify-between gap-4">

                <div>
                  <h3 className="font-bold text-xl">
                    {booking.customer_name}
                  </h3>

                  <p>{booking.customer_phone}</p>

                  <p>{booking.customer_email}</p>
                </div>

                {booking.source === "OFFLINE" && (
                  <span className="shrink-0 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-medium">
                    Offline
                  </span>
                )}

              </div>

              <hr className="my-3" />

              <p>
                <strong>Service:</strong>{" "}
                {booking.service_name}
              </p>

              {booking.package_name && (
                <p>
                  <strong>Package:</strong>{" "}
                  {booking.package_name}
                </p>
              )}

              <p>
                <strong>Date:</strong>{" "}
                {formatBookingDates(booking)}
              </p>

              {booking.payment_date && (
                <p>
                  <strong>Payment Date:</strong>{" "}
                  {booking.payment_date}
                </p>
              )}

              <p>
                <strong>Guests:</strong>{" "}
                {booking.guest_count}
              </p>

              {booking.quantity && booking.quantity > 1 && (
                <p>
                  <strong>Rooms:</strong>{" "}
                  {booking.quantity}
                </p>
              )}

              {booking.amount != null && (
                <p>
                  <strong>Amount:</strong> ₹
                  {booking.amount.toLocaleString("en-IN")}
                </p>
              )}

              <p>
                <strong>Status:</strong>{" "}
                {statusText(booking)}
              </p>

              <p>
                <strong>Notes:</strong>{" "}
                {booking.notes || "-"}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">

                {(booking.booking_status === "PENDING" ||
                  booking.booking_status === "AWAITING_PAYMENT") && (
                  <button
                    onClick={() =>
                      handleStatusUpdate(booking.id, "REJECTED")
                    }
                    className="bg-red-600 text-white px-4 py-2 rounded-lg"
                  >
                    Decline Booking
                  </button>
                )}

                {booking.source === "OFFLINE" &&
                  booking.booking_status === "CONFIRMED" && (
                    <button
                      onClick={() =>
                        handleStatusUpdate(booking.id, "REJECTED")
                      }
                      className="bg-red-600 text-white px-4 py-2 rounded-lg"
                    >
                      Cancel Entry
                    </button>
                  )}

                {booking.booking_status === "CONFIRMED" && (
                  <button
                    onClick={() => setBillBooking(booking)}
                    className="border border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#F2F3F8] px-4 py-2 rounded-lg font-medium"
                  >
                    View Bill
                  </button>
                )}

              </div>

            </div>

          ))}

        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">

            <button
              onClick={() => loadBookings(page - 1)}
              disabled={page <= 1 || loading}
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
            >
              ← Prev
            </button>

            <span className="text-gray-600">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => loadBookings(page + 1)}
              disabled={page >= totalPages || loading}
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
            >
              Next →
            </button>

          </div>
        )}

      </div>

      {billBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">

            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-[#1F2937]">
                Bill
              </h2>

              <button
                onClick={() => setBillBooking(null)}
                className="no-print text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-1">
              Bill No. OX-{billBooking.id.slice(0, 8).toUpperCase()}
            </p>

            <hr className="my-4" />

            <div className="text-sm text-[#1F2937]">
              <p className="font-semibold">
                {seller?.business_name || "Provider"}
              </p>
              {seller?.address && <p>{seller.address}</p>}
              {seller?.phone && <p>Phone: {seller.phone}</p>}
              {seller?.email && <p>Email: {seller.email}</p>}
            </div>

            <hr className="my-4" />

            <p className="text-sm text-gray-500">Billed To</p>
            <p className="font-semibold">
              {billBooking.customer_name || "-"}
            </p>
            {billBooking.customer_phone && (
              <p className="text-sm">{billBooking.customer_phone}</p>
            )}
            {billBooking.customer_email && (
              <p className="text-sm">{billBooking.customer_email}</p>
            )}

            <hr className="my-4" />

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="py-2">
                    {billBooking.service_name || "Service"}
                    {billBooking.package_name
                      ? ` — ${billBooking.package_name}`
                      : ""}
                  </td>
                  <td className="py-2">
                    {formatBookingDates(billBooking)}
                  </td>
                  <td className="py-2 text-right">
                    ₹{(billBooking.amount ?? 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>

            <hr className="my-4" />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>
                ₹{(billBooking.amount ?? 0).toLocaleString("en-IN")}
              </span>
            </div>

            {billBooking.payment_method && (
              <p className="mt-2 text-sm text-gray-500">
                Paid via {billBooking.payment_method}
                {billBooking.payment_type === "ADVANCE"
                  ? ` (Advance: ₹${(billBooking.amount_paid ?? 0).toLocaleString("en-IN")} of ₹${(billBooking.amount ?? 0).toLocaleString("en-IN")})`
                  : " (Full payment)"}
              </p>
            )}

            {billBooking.payment_date && (
              <p className="mt-1 text-sm text-gray-500">
                Paid on {billBooking.payment_date}
              </p>
            )}

            <div className="no-print mt-8 grid gap-3">
              <button
                onClick={() => window.print()}
                className="w-full bg-[#1E3A8A] hover:bg-[#182E6E] text-white py-3 rounded-xl font-semibold"
              >
                Print / Save as PDF
              </button>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={buildEmailShareHref(billBooking, seller)}
                  className="text-center border border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#F2F3F8] py-3 rounded-xl font-medium"
                >
                  Share via Email
                </a>

                <a
                  href={buildWhatsappShareHref(billBooking, seller)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center border border-green-600 text-green-700 hover:bg-green-50 py-3 rounded-xl font-medium"
                >
                  Share via WhatsApp
                </a>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
