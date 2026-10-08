"use client";

interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  isPaidMember?: boolean;
}

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/context/NotificationContext";
import axios from "axios";

import ProviderHero from "@/components/provider/ProviderHero";
import GalleryGrid from "@/components/provider/GalleryGrid";
import AboutSection from "@/components/provider/AboutSection";
import ServicesSection from "@/components/provider/ServicesSection";
import PackagesSection from "@/components/provider/PackagesSection";
import ReviewsSection from "@/components/provider/ReviewsSection";

import {
  ProviderDetails,
  ProviderService,
  PricingPackage,
} from "@/types/provider";

import BookingCard from "@/components/provider/BookingCard";
import { createBooking } from "@/services/bookingApi";
import { getEarliestBookableDate, getLatestBookableDate } from "@/utils/bookingRules";
import {
  getProviderDetails,
} from "@/services/providerDetailsApi";
import {
  getProviderReviews,
  type Review,
} from "@/services/reviewApi";
import {
  calculateEstimatedCost,
  calculateNumDays,
  MAX_GUESTS_PER_ROOM,
  MAX_PEOPLE_QUANTITY,
  needsPerItemQuantity,
  BOOKING_CHARGE_AMOUNT,
} from "@/utils/pricing";
import { addToCart, isInCart } from "@/utils/cart";
import { addCollabService } from "@/services/collabApi";
import { getActiveCollabSession } from "@/utils/collabSession";
import { getCategories } from "@/services/catalogApi";
import {
  createCombinedPaymentOrder,
  verifyCombinedPayment,
  confirmTestCombinedPayment,
} from "@/services/paymentApi";
import {
  loadRazorpayScript,
  type RazorpaySuccessResponse,
} from "@/utils/razorpay";

const ACCOMMODATION_CATEGORY = "Accommodation";


interface Props {
  providerId: string;
}

export default function ProviderDetailsPage({
  providerId,
}: Props) {
  const toast = useToast();

  const [details, setDetails] =
    useState<ProviderDetails | null>(null);

  const [loading, setLoading] =
    useState(true);
 
  const [selectedService, setSelectedService] =
    useState<ProviderService | null>(null);
  const [selectedDate, setSelectedDate] =
    useState("");
  const [eventTime, setEventTime] =
    useState("");
  const [endDate, setEndDate] =
    useState("");
  const [quantity, setQuantity] =
    useState(1);
  const [selectedPackage, setSelectedPackage] =
    useState<PricingPackage | null>(null);
  const [guestCount, setGuestCount] =
    useState(0);

  const [notes, setNotes] =
    useState("");

  const [addedToCart, setAddedToCart] =
    useState(false);

  // "Add to Group Session" - only shown when this browser is inside an
  // active "plan together" session (see /collab/[sessionId]), so
  // participants can add whatever they're looking at to the shared
  // list everyone else in the session sees.
  const [addingToSession, setAddingToSession] = useState(false);
  const [addedToSession, setAddedToSession] = useState(false);

  const [paying, setPaying] =
    useState(false);

  const [currentUser, setCurrentUser] =
  useState<CurrentUser | null>(null);

  const [userChecked, setUserChecked] =
    useState(false);

  const [categoryNames, setCategoryNames] =
    useState<Record<string, string>>({});

  const [reviews, setReviews] =
    useState<Review[]>([]);

useEffect(() => {
  getCategories()
    .then((categories) => {
      const map: Record<string, string> = {};
      categories.forEach((category) => {
        map[category.id] = category.name;
      });
      setCategoryNames(map);
    })
    .catch((error) => console.error(error));
}, []);

useEffect(() => {
  const user = localStorage.getItem("user");

  if (user) {

    setCurrentUser(
      JSON.parse(user) as CurrentUser
    );
  }

  setUserChecked(true);
}, []);

    console.log("providerId =", providerId);

  const loadProvider = useCallback(async () => {

    try {

        setLoading(true);

        const data =
            await getProviderDetails(providerId);

        setDetails({
            ...data,
            provider: {
                ...data.provider,
                starting_price: data.starting_price,
                rating: data.rating,
                review_count: data.review_count,
            },
            });
    }
    catch(err){

        console.error(err);

    }
    finally{

        setLoading(false);

    }

}, [providerId]);

useEffect(() => {
  loadProvider();
}, [loadProvider]);

useEffect(() => {
  getProviderReviews(providerId)
    .then(setReviews)
    .catch((error) => console.error(error));
}, [providerId]);

  function handleServiceSelect(
    service: ProviderService
){

    setSelectedService(service);

    setSelectedPackage(null);

    setAddedToCart(false);

}

  // Bookings are created AWAITING_PAYMENT already - Book Now goes
  // straight to Razorpay instead of waiting for the provider to
  // accept the request first. Uses the same combined-order endpoint
  // as the cart flow (with a single booking id) so the OX application
  // fee for free-plan customers is folded into this ONE payment
  // instead of being a separate popup beforehand - paid members never
  // get the fee added (includeBookingCharge is false for them).
  async function startPayment(
    bookingId: string,
    serviceLabel: string,
    includeBookingCharge: boolean
  ) {
    try {
      const order = await createCombinedPaymentOrder([bookingId], {
        customerId: currentUser?.id,
        includeBookingCharge,
      });

      // Dev/test mode: no real Razorpay order exists, so skip
      // checkout entirely and confirm the booking directly instead
      // of opening the payment widget.
      if (order.test_mode) {
        await confirmTestCombinedPayment(order.order_id);
        toast.success("Payment successful! Your booking is confirmed.");
        setPaying(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        toast.error(
          "Booking created, but the payment gateway couldn't load. " +
            "You can pay from My Bookings instead."
        );
        return;
      }

      const razorpay = new window.Razorpay({
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "OccasionX",
        description: serviceLabel,
        prefill: {
          name: currentUser?.fullName,
          email: currentUser?.email,
        },
        theme: {
          color: "#1E3A8A",
        },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            await verifyCombinedPayment({
              // Non-null: checkout was opened with order_id, so Razorpay
              // always includes these in the success callback.
              razorpay_order_id: response.razorpay_order_id!,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature!,
            });

            toast.success("Payment successful! Your booking is confirmed.");
          } catch (err) {
            console.error(err);
            toast.error(
              "Payment verification failed. If money was deducted, " +
                "it will be refunded - please contact support."
            );
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast.error(
              "Booking created but payment wasn't completed. " +
                "You can finish paying from My Bookings."
            );
          },
        },
      });

      razorpay.open();
    } catch (err) {
      console.error(err);
      toast.error(
        "Booking created, but starting payment failed. " +
          "You can pay from My Bookings instead."
      );
      setPaying(false);
    }
  }

useEffect(() => {

  if (!selectedService) {
    setAddedToCart(false);
    return;
  }

  setAddedToCart(isInCart(selectedService.id));

}, [selectedService, selectedPackage]);

  const selectedCategoryName = selectedService?.category_id
    ? categoryNames[selectedService.category_id]
    : undefined;

  // Accommodation (hotel rooms) gets a Rooms input auto-calculated from
  // guest count; other PER_DAY categories like Venue are flat per-day
  // with no room count.
  const isAccommodation =
    selectedCategoryName === ACCOMMODATION_CATEGORY;

  // Per-person services like Makeup & Grooming shouldn't default to
  // the full guest count - the customer sets exactly how many people
  // it covers instead, capped at MAX_PEOPLE_QUANTITY.
  const isGroomingCategory =
    !isAccommodation && needsPerItemQuantity(selectedCategoryName);

useEffect(() => {

  if (!isAccommodation || !selectedPackage?.occupancy_per_room) {
    return;
  }

  const suggestedRooms = Math.max(
    1,
    Math.ceil(guestCount / selectedPackage.occupancy_per_room)
  );

  setQuantity(suggestedRooms);

  // Re-suggest whenever the guest count or selected package changes -
  // the customer can still edit the Rooms field afterward.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [guestCount, selectedPackage, isAccommodation]);

useEffect(() => {

  if (!isGroomingCategory) return;

  setQuantity(
    Math.min(
      MAX_PEOPLE_QUANTITY,
      Math.max(1, selectedPackage?.min_quantity || 1)
    )
  );

  // Re-suggest whenever the selected service/package changes - the
  // customer can still edit the People field afterward.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedService, selectedPackage, isGroomingCategory]);

 if (loading || !userChecked) {
   return (
  <div className="min-h-screen flex items-center justify-center">
    Loading provider...
  </div>
);
}

if (!details) {
   return (
  <div className="min-h-screen flex items-center justify-center">
    Provider not found.
  </div>
);
}

if (!currentUser) {
  return (
    <div className="bg-[#F8F6F2] min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="relative h-[360px] rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
          <img
            src={
              details.portfolio[0]?.media_url ||
              "/OXLogoWeb.png"
            }
            alt={details.provider.business_name}
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute bottom-8 left-8 text-white">
            <h1 className="text-4xl font-bold">
              {details.provider.business_name}
            </h1>

            <div className="flex items-center gap-2 mt-3">
              <span className="font-semibold">
                ★ {details.provider.rating ?? 0}
              </span>

              <span className="text-white/80">
                ({details.provider.review_count ?? 0} reviews)
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl bg-white border border-gray-200 shadow-sm p-10 text-center">
          <h2 className="text-2xl font-bold text-[#1F2937]">
            Sign in to see full details and book
          </h2>

          <p className="mt-3 text-gray-500 max-w-md mx-auto">
            Create a free account to view services, pricing,
            photos, and contact details for{" "}
            {details.provider.business_name}, and to request a
            booking.
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <a
              href="/signin"
              className="bg-[#1E3A8A] hover:bg-[#182E6E] text-white px-8 py-3 rounded-xl font-semibold transition"
            >
              Sign In
            </a>

            <a
              href="/register"
              className="border border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#F8F6F2] px-8 py-3 rounded-xl font-semibold transition"
            >
              Create Account
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

  return (
    <div className="bg-[#F8F6F2] min-h-screen">

      <div className="max-w-7xl mx-auto px-6 py-10">

        <ProviderHero
            provider={details.provider}
            coverImage={
              details.portfolio[0]?.media_url
            }
          />

        <div className="grid lg:grid-cols-3 gap-10 mt-10">

          {/* Left */}

          <div className="lg:col-span-2 space-y-10">

        <GalleryGrid
          images={details.portfolio}
        />

        <AboutSection
          provider={details.provider}
        />

        <ServicesSection
          services={details.services}
          onSelectService={handleServiceSelect}
        />

        <PackagesSection
          packages={selectedService?.pricing ?? []}
          selectedPackage={selectedPackage?.id}
          onSelectPackage={setSelectedPackage}
        />

        <ReviewsSection reviews={reviews} />

      </div>

          {/* Right */}

      <div>

      <BookingCard
        serviceName={selectedService?.name}
        packageName={selectedPackage?.pricing_type}
        addedToCart={addedToCart}
        onAddToCart={() => {

          if (!selectedService) {
            toast.error("Select a service");
            return;
          }

          if (!selectedPackage) {
            toast.error("Select a package");
            return;
          }

          addToCart({
            provider_id: details.provider.id,
            provider_name: details.provider.business_name,
            service_id: selectedService.id,
            service_name: selectedService.name,
            category_id: selectedService.category_id,
            category_name: selectedCategoryName,
            pricing_id: selectedPackage.id,
            price: selectedPackage.amount,
            pricing_type: selectedPackage.pricing_type,
            unit: selectedPackage.unit,
            min_quantity: selectedPackage.min_quantity,
            max_quantity: selectedPackage.max_quantity,
            occupancy_per_room: selectedPackage.occupancy_per_room,
            rating: details.provider.rating ?? 0,
            quantity:
              isAccommodation || isGroomingCategory
                ? quantity
                : undefined,
            event_date: selectedDate || undefined,
            event_time: eventTime || undefined,
            event_end_date:
              isAccommodation && endDate ? endDate : undefined,
            guest_count: guestCount || undefined,
            notes: notes.trim() || undefined,
          });

          setAddedToCart(true);
        }}
        price={
          selectedPackage
            ? calculateEstimatedCost(
                selectedPackage.amount,
                selectedPackage.pricing_type,
                guestCount,
                selectedPackage.min_quantity,
                selectedPackage.max_quantity,
                calculateNumDays(selectedDate, endDate),
                // undefined (not 1) for non-accommodation/grooming
                // services, so calculateEstimatedCost's `quantity ??
                // guestCount` fallback actually uses the real guest
                // count instead of always pricing at quantity=1
                // (clamped up to min_quantity) - see BookingReview.tsx
                // for the same pattern.
                isAccommodation || isGroomingCategory ? quantity : undefined
              )
            : undefined
        }
        pricingType={selectedPackage?.pricing_type}
        showRooms={isAccommodation}
        showPeopleCount={isGroomingCategory}
        totalRooms={selectedPackage?.total_rooms}
        isFreeUser={!currentUser?.isPaidMember}
        applicationFee={
          !currentUser?.isPaidMember ? BOOKING_CHARGE_AMOUNT : 0
        }
        selectedDate={selectedDate}
        eventTime={eventTime}
        onTimeChange={setEventTime}
        bookingNoticeHours={details.provider.booking_notice_hours}
        cancellationPolicy={details.provider.cancellation_policy}
        minDate={getEarliestBookableDate()}
        maxDate={getLatestBookableDate()}
        endDate={endDate}
        quantity={quantity}
        guestCount={guestCount}
        notes={notes}
        onDateChange={setSelectedDate}
        onEndDateChange={setEndDate}
        onQuantityChange={setQuantity}
        onGuestChange={setGuestCount}
        onNotesChange={setNotes}
        submitting={paying}

        onBook={async () => {

          if (!currentUser?.id) {

          toast.error("Please login first");

          return;
          }

          if (!selectedService) {
            toast.error("Select a service");
            return;
          }

          if (!selectedPackage) {
            toast.error("Select a package");
            return;
          }

          if (!selectedDate) {
            toast.error("Select a date");
            return;
          }

          if (!eventTime) {
            toast.error("Select an event time");
            return;
          }

          if (
            isAccommodation &&
            guestCount > quantity * MAX_GUESTS_PER_ROOM
          ) {
            toast.error(
              `No. of guests per room should not exceed ${MAX_GUESTS_PER_ROOM} per room. ` +
                `Increase the number of Rooms to fit ${guestCount} guests.`
            );
            return;
          }

          try {

            setPaying(true);

            const booking = await createBooking({
              customer_id: currentUser.id,
              provider_id: details.provider.id,
              service_id: selectedService.id,
              pricing_id: selectedPackage.id,
              event_date: selectedDate,
              event_time: eventTime,
              event_end_date: isAccommodation ? endDate || undefined : undefined,
              quantity:
                isAccommodation || isGroomingCategory
                  ? quantity
                  : undefined,
              guest_count: guestCount,
              notes,
              customer_name: currentUser.fullName,
              customer_email: currentUser.email,
              customer_phone: currentUser.mobile,
              provider_name: details.provider.business_name,
              service_name: selectedService.name,
              package_name: selectedPackage.pricing_type,
              category_name: selectedCategoryName,
              amount: calculateEstimatedCost(
                selectedPackage.amount,
                selectedPackage.pricing_type,
                guestCount,
                selectedPackage.min_quantity,
                selectedPackage.max_quantity,
                calculateNumDays(selectedDate, endDate),
                // Same fix as the price prop above - undefined lets
                // the real guest count through instead of forcing
                // quantity=1.
                isAccommodation || isGroomingCategory ? quantity : undefined
              ),
            });

            await startPayment(
              booking.id,
              selectedService.name,
              !currentUser.isPaidMember
            );

          } catch (err) {

            console.error(err);

            const message =
              axios.isAxiosError(err) && err.response?.data?.detail
                ? err.response.data.detail
                : "Failed to create booking. Please try again.";

            toast.error(message);

            setPaying(false);

          }

        }}
      />

      {getActiveCollabSession() && (
        <button
          type="button"
          disabled={addingToSession}
          onClick={async () => {
            const active = getActiveCollabSession();
            if (!active) return;

            try {
              setAddingToSession(true);
              await addCollabService(
                active.sessionId,
                active.participantId,
                details.provider.id,
                details.provider.business_name,
                selectedCategoryName,
                selectedService?.id
              );
              setAddedToSession(true);
              toast.success("Added to your group session");
            } catch (err) {
              console.error(err);
              toast.error("Couldn't add this to the group session.");
            } finally {
              setAddingToSession(false);
            }
          }}
          className="mt-3 w-full rounded-xl border border-[#1E3A8A] py-3 text-sm font-semibold text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white transition disabled:opacity-60"
        >
          {addingToSession
            ? "Adding..."
            : addedToSession
              ? "Added to Group Session"
              : "Add to Group Session"}
        </button>
      )}

      </div>

        </div>

      </div>
    </div>
  );
}