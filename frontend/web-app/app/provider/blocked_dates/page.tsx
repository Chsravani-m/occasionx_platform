"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  getProviderServices
} from "@/services/providerServiceApi";

import {
  createBlockedDate,
  getBlockedDates,
  deleteBlockedDate
} from "@/services/providerBlockedDateApi";

import {
  getProviderBookings,
  createOfflineBooking,
  formatBookingDates,
  type Booking,
  type OfflineBookingPayload,
} from "@/services/bookingApi";

import { getProviderDetails } from "@/services/providerDetailsApi";

import { useToast, useConfirm } from "@/context/NotificationContext";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { detail?: string } } })
      .response;
    if (response?.data?.detail) return response.data.detail;
  }
  return fallback;
}

interface Service {
  id: string;
  name: string;
}

interface SellerInfo {
  business_name: string;
  phone?: string;
  email?: string;
  address?: string;
}

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Other"];

interface BlockedDate {
  id: string;
  blocked_from: string;
  blocked_to: string;
  reason?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Bookings that actually hold the date - a REJECTED request never
// blocked anything, so it's excluded from the calendar.
const ACTIVE_BOOKING_STATUSES = [
  "PENDING",
  "AWAITING_PAYMENT",
  "CONFIRMED",
];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function bookingStatusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-[#E0E4EF] text-[#182E6E]";
    case "AWAITING_PAYMENT":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
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

const emptyOfflineForm = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  serviceName: "",
  endDate: "",
  paymentDate: "",
  amount: "",
  paymentMethod: "Cash",
  paymentType: "FULL" as "FULL" | "ADVANCE",
  amountPaid: "",
  guestCount: "",
  notes: "",
};

export default function ProviderBlockedDatesPage() {

  const toast = useToast();
  const confirmDialog = useConfirm();

  const [services, setServices] =
    useState<Service[]>([]);

  const [selectedService, setSelectedService] =
    useState("");

  const [blockedFrom, setBlockedFrom] =
    useState("");

  const [blockedTo, setBlockedTo] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [blockedDates, setBlockedDates] =
    useState<BlockedDate[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [bookingsLoading, setBookingsLoading] =
    useState(true);

  const [cursor, setCursor] =
    useState(() => new Date());

  const [selectedKey, setSelectedKey] =
    useState<string | null>(null);

  // Manual blocked periods across every service (not just the one
  // selected in the form below) - used to color the calendar red even
  // for dates blocked by hand rather than by a real booking.
  const [allBlockedRanges, setAllBlockedRanges] =
    useState<BlockedDate[]>([]);

  const [offlineDateKey, setOfflineDateKey] =
    useState<string | null>(null);

  const [offlineForm, setOfflineForm] =
    useState(emptyOfflineForm);

  const [submittingOffline, setSubmittingOffline] =
    useState(false);

  const [seller, setSeller] =
    useState<SellerInfo | null>(null);

  const [billBooking, setBillBooking] =
    useState<Booking | null>(null);

  const todayKey = toDateKey(new Date());

  const loadBookings = async () => {

    try {

      const providerId =
        localStorage.getItem(
          "provider_id"
        );

      if (!providerId) return;

      const data =
        await getProviderBookings(
          providerId
        );

      setBookings(
        data.filter((booking) =>
          ACTIVE_BOOKING_STATUSES.includes(
            booking.booking_status
          )
        )
      );

    } catch (error) {

      console.error(error);

    } finally {

      setBookingsLoading(false);

    }
  };

  useEffect(() => {

    void loadBookings();

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

  }, []);

  const bookingsByDate = useMemo(() => {

    const map = new Map<string, Booking[]>();

    bookings.forEach((booking) => {

      const start = new Date(booking.event_date);

      const end = booking.event_end_date
        ? new Date(booking.event_end_date)
        : start;

      const cur = new Date(start);

      while (cur <= end) {

        const key = toDateKey(cur);

        const list = map.get(key) || [];

        list.push(booking);

        map.set(key, list);

        cur.setDate(cur.getDate() + 1);
      }
    });

    return map;

  }, [bookings]);

  const calendarYear = cursor.getFullYear();
  const calendarMonth = cursor.getMonth();

  const firstDayOfMonth = new Date(
    calendarYear,
    calendarMonth,
    1
  );

  const startWeekday = firstDayOfMonth.getDay();

  const daysInMonth = new Date(
    calendarYear,
    calendarMonth + 1,
    0
  ).getDate();

  const calendarCells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(calendarYear, calendarMonth, i + 1)
    ),
  ];

  const selectedBookings = selectedKey
    ? bookingsByDate.get(selectedKey) || []
    : [];

  useEffect(() => {

    const loadServices = async () => {

      const providerId =
        localStorage.getItem(
          "provider_id"
        );

      if (!providerId) return;

      const data =
        await getProviderServices(
          providerId
        );

      setServices(data);

      try {

        const rangesPerService = await Promise.all(
          data.map((service: Service) =>
            getBlockedDates(service.id).catch(() => [])
          )
        );

        setAllBlockedRanges(rangesPerService.flat());

      } catch (error) {

        console.error(error);

      }
    };

    void loadServices();

  }, []);

  const blockedRangeDates = useMemo(() => {

    const set = new Set<string>();

    allBlockedRanges.forEach((range) => {

      const start = new Date(range.blocked_from);
      const end = new Date(range.blocked_to);
      const cur = new Date(start);

      while (cur <= end) {

        set.add(toDateKey(cur));

        cur.setDate(cur.getDate() + 1);
      }
    });

    return set;

  }, [allBlockedRanges]);

  const loadBlockedDates =
    async (
      serviceId: string
    ) => {

      if (!serviceId) return;

      const data =
        await getBlockedDates(
          serviceId
        );

      setBlockedDates(data);
    };

  const handleCreate =
    async () => {

      if (
        !selectedService ||
        !blockedFrom ||
        !blockedTo
      ) {
        toast.error(
          "Please fill all required fields"
        );
        return;
      }

      try {

        setLoading(true);

        await createBlockedDate(
          selectedService,
          {
            blocked_from:
              blockedFrom,
            blocked_to:
              blockedTo,
            reason
          }
        );

        setBlockedFrom("");
        setBlockedTo("");
        setReason("");

        await loadBlockedDates(
          selectedService
        );

      } catch (error) {

        console.error(error);

        toast.error(
          getErrorMessage(error, "Failed to create blocked dates")
        );

      } finally {

        setLoading(false);
      }
    };

  const handleDelete =
    async (
      blockedId: string
    ) => {

      if (
        !(await confirmDialog({
          message: "Delete blocked period?",
          danger: true,
        }))
      ) {
        return;
      }

      try {

        await deleteBlockedDate(
          blockedId
        );

        await loadBlockedDates(
          selectedService
        );

      } catch (error) {

        console.error(error);

        toast.error(
          getErrorMessage(error, "Could not delete blocked period")
        );
      }
    };

  const handleCreateOffline = async () => {

    if (!offlineDateKey) return;

    if (
      !offlineForm.customerName ||
      !offlineForm.customerPhone ||
      !offlineForm.serviceName ||
      !offlineForm.amount
    ) {
      toast.error(
        "Customer name, phone number, service description and amount are required."
      );
      return;
    }

    if (Number(offlineForm.amount) <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }

    if (
      offlineForm.paymentType === "ADVANCE" &&
      Number(offlineForm.amountPaid) > Number(offlineForm.amount)
    ) {
      toast.error("Advance paid can't be more than the total amount.");
      return;
    }

    const providerId = localStorage.getItem("provider_id");

    if (!providerId) return;

    const payload: OfflineBookingPayload = {
      customer_name: offlineForm.customerName,
      customer_phone: offlineForm.customerPhone,
      customer_email: offlineForm.customerEmail || undefined,
      service_name: offlineForm.serviceName,
      event_date: offlineDateKey,
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
      setOfflineDateKey(null);
      setBillBooking(created);

      await loadBookings();

    } catch (error) {

      console.error(error);

      toast.error(
        getErrorMessage(error, "Unable to save this booking. Please try again.")
      );

    } finally {

      setSubmittingOffline(false);

    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>
          <h1 className="text-4xl font-bold text-[#1F2937]">
            Availability
          </h1>

          <p className="text-gray-500 mt-2">
            See every booked date across all your services, and mark
            dates unavailable when you need to.
          </p>
        </div>

        <Link
          href="/provider/dashboard"
          className="
            bg-[#1E3A8A]
            hover:bg-[#182E6E]
            text-white
            px-5
            py-3
            rounded-xl
            font-semibold
            transition
            whitespace-nowrap
          "
        >
          Go to Dashboard
        </Link>

      </div>

      {/* Booking Calendar */}

      <div className="bg-white rounded-3xl shadow mt-8 p-8">

        <h2 className="text-xl font-semibold mb-6">
          Booking Calendar
        </h2>

        {bookingsLoading ? (
          <p className="text-gray-500">Loading bookings...</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() =>
                  setCursor(
                    new Date(calendarYear, calendarMonth - 1, 1)
                  )
                }
                className="rounded-lg border px-3 py-1 text-[#1F2937] hover:bg-[#F8F6F2]"
              >
                ← Prev
              </button>

              <h3 className="text-lg font-semibold text-[#1F2937]">
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </h3>

              <button
                onClick={() =>
                  setCursor(
                    new Date(calendarYear, calendarMonth + 1, 1)
                  )
                }
                className="rounded-lg border px-3 py-1 text-[#1F2937] hover:bg-[#F8F6F2]"
              >
                Next →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((date, index) => {
                if (!date) {
                  return <div key={`blank-${index}`} />;
                }

                const key = toDateKey(date);
                const dayBookings = bookingsByDate.get(key) || [];
                const hasBookings = dayBookings.length > 0;
                const isManuallyBlocked = blockedRangeDates.has(key);
                const isBlocked = hasBookings || isManuallyBlocked;
                const isSelected = selectedKey === key;
                const isPast = key < todayKey;

                return (
                  <button
                    key={key}
                    disabled={isPast}
                    onClick={() => {
                      if (isPast) return;

                      if (isBlocked) {
                        setSelectedKey(isSelected ? null : key);
                      } else {
                        setOfflineDateKey(key);
                        setOfflineForm(emptyOfflineForm);
                      }
                    }}
                    title={
                      isPast
                        ? "Past date"
                        : isBlocked
                        ? "Blocked - click for details"
                        : "Available - click to log an offline booking"
                    }
                    className={`flex h-16 flex-col items-center justify-start rounded-lg p-1 text-sm transition ${
                      isPast
                        ? "bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed"
                        : isSelected
                        ? "bg-[#1E3A8A] text-white"
                        : isBlocked
                        ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                    }`}
                  >
                    <span>{date.getDate()}</span>

                    {isBlocked && (
                      <span
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${
                          isPast
                            ? "bg-gray-300"
                            : isSelected
                            ? "bg-white"
                            : "bg-red-500"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-green-50 border border-green-200" />
                Available - click to log an offline booking
              </span>

              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-red-50 border border-red-200" />
                Blocked - has a booking or manual block
              </span>
            </div>
          </>
        )}

      </div>

      {selectedKey && (
        <div className="mt-6">
          <h3 className="mb-3 text-lg font-semibold text-[#1F2937]">
            Bookings on {selectedKey}
          </h3>

          <div className="space-y-3">
            {selectedBookings.length === 0 && (
              <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-gray-500">
                No bookings on this date.
              </div>
            )}

            {selectedBookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-3xl bg-white p-6 shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg text-[#1F2937]">
                      {booking.service_name || "Service"}
                      {booking.package_name
                        ? ` — ${booking.package_name}`
                        : ""}
                    </h4>

                    <p className="text-sm text-gray-500 mt-1">
                      {formatBookingDates(booking)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${bookingStatusColor(
                      booking.booking_status
                    )}`}
                  >
                    {booking.booking_status}
                  </span>
                </div>

                <hr className="my-4" />

                <div className="grid sm:grid-cols-2 gap-y-2 text-sm text-[#1F2937]">
                  <p>
                    <strong>Customer:</strong>{" "}
                    {booking.customer_name || "-"}
                  </p>

                  <p>
                    <strong>Guests:</strong> {booking.guest_count}
                  </p>

                  {booking.customer_phone && (
                    <p>
                      <strong>Phone:</strong>{" "}
                      <a
                        href={`tel:${booking.customer_phone}`}
                        className="text-[#1E3A8A] underline"
                      >
                        {booking.customer_phone}
                      </a>
                    </p>
                  )}

                  {booking.quantity && booking.quantity > 1 && (
                    <p>
                      <strong>Rooms:</strong> {booking.quantity}
                    </p>
                  )}

                  {booking.customer_email && (
                    <p className="sm:col-span-2">
                      <strong>Email:</strong>{" "}
                      {booking.customer_email}
                    </p>
                  )}

                  {booking.amount != null && (
                    <p>
                      <strong>Amount:</strong> ₹
                      {booking.amount.toLocaleString("en-IN")}
                    </p>
                  )}

                  {booking.notes && (
                    <p className="sm:col-span-2">
                      <strong>Notes:</strong> {booking.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow mt-8 p-8">

        <h2 className="text-xl font-semibold mb-6">
          Add Blocked Period
        </h2>

        <div className="space-y-4">

          <select
            value={selectedService}
            onChange={(e) => {

              setSelectedService(
                e.target.value
              );

              void loadBlockedDates(
                e.target.value
              );

            }}
            className="
              w-full
              border
              rounded-xl
              p-4
            "
          >
            <option value="">
              Select Service
            </option>

            {services.map((service) => (

              <option
                key={service.id}
                value={service.id}
              >
                {service.name}
              </option>

            ))}
          </select>

          <div className="grid md:grid-cols-2 gap-4">

            <div>
              <label className="text-sm text-gray-600">
                Blocked From
              </label>

              <input
                type="date"
                min={todayKey}
                value={blockedFrom}
                onChange={(e) =>
                  setBlockedFrom(
                    e.target.value
                  )
                }
                className="
                  w-full
                  border
                  rounded-xl
                  p-4
                "
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                Blocked To
              </label>

              <input
                type="date"
                min={blockedFrom || todayKey}
                value={blockedTo}
                onChange={(e) =>
                  setBlockedTo(
                    e.target.value
                  )
                }
                className="
                  w-full
                  border
                  rounded-xl
                  p-4
                "
              />
            </div>

          </div>

          <textarea
            value={reason}
            onChange={(e) =>
              setReason(
                e.target.value
              )
            }
            placeholder="Reason (Wedding booking, Personal leave, Maintenance...)"
            rows={4}
            className="
              w-full
              border
              rounded-xl
              p-4
            "
          />

          <button
            onClick={handleCreate}
            disabled={loading}
            className="
              w-full
              bg-[#1E3A8A]
              hover:bg-[#182E6E]
              text-white
              py-4
              rounded-xl
              font-semibold
            "
          >
            {loading
              ? "Saving..."
              : "Block Dates"}
          </button>

        </div>

      </div>

      <div className="mt-10">

        <h2 className="text-2xl font-semibold mb-6">
          Existing Blocked Periods
        </h2>

        {blockedDates.length === 0 && (
          <div className="
            bg-white
            rounded-2xl
            p-8
            text-center
            text-gray-500
          ">
            No blocked dates configured.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">

          {blockedDates.map((item) => (

            <div
              key={item.id}
              className="
                bg-white
                rounded-3xl
                shadow
                p-6
              "
            >

              <h3 className="font-semibold text-lg">
                {item.blocked_from}
              </h3>

              <p className="text-gray-500">
                to
              </p>

              <h3 className="font-semibold text-lg">
                {item.blocked_to}
              </h3>

              {item.reason && (
                <p className="mt-4 text-gray-600">
                  {item.reason}
                </p>
              )}

              <button
                onClick={() =>
                  handleDelete(
                    item.id
                  )
                }
                className="
                  mt-6
                  text-red-600
                  font-medium
                "
              >
                Delete
              </button>

            </div>

          ))}

        </div>

      </div>

      {offlineDateKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">
                  Log Offline Booking
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Log a job you did (or are doing) outside OccasionX -
                  it'll block the date across your services.
                </p>
              </div>

              <button
                onClick={() => setOfflineDateKey(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4">

              <div>
                <label className="text-sm text-gray-600">
                  Event Start Date *
                </label>

                <input
                  type="date"
                  min={todayKey}
                  value={offlineDateKey}
                  onChange={(e) => setOfflineDateKey(e.target.value)}
                  className="w-full border rounded-xl p-3"
                />
              </div>

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

              <div className="grid grid-cols-2 gap-4">
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
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">
                    End Date (optional)
                  </label>

                  <input
                    type="date"
                    min={offlineDateKey}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                className="w-full border rounded-xl p-3"
              />

            </div>

            <button
              onClick={handleCreateOffline}
              disabled={submittingOffline}
              className="mt-6 w-full bg-[#1E3A8A] hover:bg-[#182E6E] text-white py-4 rounded-xl font-semibold disabled:opacity-60"
            >
              {submittingOffline ? "Saving..." : "Save Offline Booking"}
            </button>

          </div>

        </div>
      )}

      {billBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-start justify-between no-print">
              <h2 className="text-2xl font-bold text-[#1F2937]">
                Bill
              </h2>

              <button
                onClick={() => setBillBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
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