"use client";

import { isPaidMember } from "@/utils/auth";
import {
  createBookingCharge,
  verifyBookingCharge,
  confirmTestBookingCharge,
} from "@/services/bookingChargeApi";
import {
  loadRazorpayScript,
  type RazorpaySuccessResponse,
} from "@/utils/razorpay";

/**
 * Free (non-paid-member) customers pay a small booking service charge
 * before a booking is created - paid members skip this entirely since
 * they already paid the one-time membership fee at registration.
 *
 * Returns true when it's OK to go ahead and create the booking now
 * (either already a paid member, or the charge was just paid
 * successfully). Returns false when the charge was cancelled or
 * failed, in which case the booking should NOT be created.
 *
 * This is a plain utility function, not a component, so it can't call
 * the useToast() hook directly - callers pass their own toast.error
 * (see src/context/NotificationContext.tsx) so failures still show as
 * an in-app toast instead of a native alert().
 */
export async function ensureBookingChargePaid(
  customerId: string,
  notifyError: (message: string) => void = (msg) => console.error(msg)
): Promise<boolean> {
  if (isPaidMember()) return true;

  try {
    const order = await createBookingCharge(customerId);

    // Dev/test mode: no real Razorpay order exists, so skip checkout
    // entirely and confirm the charge directly instead of opening the
    // payment widget.
    if (order.test_mode) {
      await confirmTestBookingCharge(order.order_id);
      return true;
    }

    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      notifyError(
        "The payment gateway couldn't load, so the booking service " +
          "charge couldn't be collected. Please try again."
      );
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      const razorpay = new window.Razorpay({
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "OccasionX",
        description: "Booking Service Charge",
        theme: {
          color: "#1E3A8A",
        },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            await verifyBookingCharge({
              // Non-null: checkout was opened with order_id, so Razorpay
              // always includes these in the success callback.
              razorpay_order_id: response.razorpay_order_id!,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature!,
            });

            resolve(true);
          } catch (err) {
            console.error(err);
            notifyError(
              "The booking service charge couldn't be verified. " +
                "Please try again."
            );
            resolve(false);
          }
        },
        modal: {
          ondismiss: () => {
            notifyError(
              "Booking cancelled - the booking service charge wasn't " +
                "completed."
            );
            resolve(false);
          },
        },
      });

      razorpay.open();
    });
  } catch (err) {
    console.error(err);
    notifyError(
      "Couldn't start the booking service charge payment. Please try again."
    );
    return false;
  }
}
