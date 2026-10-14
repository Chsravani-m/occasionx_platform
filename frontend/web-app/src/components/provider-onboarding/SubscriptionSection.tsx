"use client";
import {
  API_GATEWAY_URL,
  authHeaders,
  ONBOARDING_TOKEN_KEY,
} from "@/lib/apiClient";

import { useState, useEffect } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";
import { RazorpayErrorResponse, RazorpayOptions } from "@/types/razorpay";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function SubscriptionSection() {
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [errorMessage, setErrorMessage] =
  useState("");
  const [paymentComplete, setPaymentComplete] =
    useState(false);
  // Only ever set in PAYMENT_TEST_MODE - see mark-registration-paid's
  // test-mode-only response in provider-service. Test registrations
  // are routinely created with fake email addresses, so there's no
  // real inbox to check; showing the link directly here means testing
  // the flow doesn't require digging through server logs/DB for the
  // activation token.
  const [activationLink, setActivationLink] = useState<string | null>(
    null
  );
  const router = useRouter();

  const finishRegistration = (testActivationLink?: string) => {
    // Payment is done, which means an activation email is on its
    // way - the provider can't log in again until they click it, so
    // there's no point keeping this session (or pushing them to the
    // dashboard, which would immediately redirect them back here).
    // Clear the session and show a "check your email" confirmation
    // instead.
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("provider_id");
    localStorage.removeItem(ONBOARDING_TOKEN_KEY);

    if (testActivationLink) {
      setActivationLink(testActivationLink);
    }

    setPaymentComplete(true);
  };

  useEffect(() => {

    const script =
      document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    document.body.appendChild(script);

  }, []);

  const payNow = async () => {

    try {

      const providerId =
        localStorage.getItem(
          "provider_id"
        );

      if (!providerId) {

        toast.error(
          "Provider not found"
        );

        return;
      }

      const res = await fetch(
        `${API_GATEWAY_URL}/providers/${providerId}/registration-payment`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      if (!res.ok) {

        throw new Error(
          "Unable to create payment order"
        );
      }

      const data =
        await res.json();

      console.log("ORDER RESPONSE", data);

      // Dev/test mode: no real Razorpay order exists on the backend,
      // so skip checkout entirely and confirm the registration fee
      // directly via the test-only mark-registration-paid endpoint
      // (which itself refuses to run unless the backend has
      // PAYMENT_TEST_MODE=true set).
      if (data.test_mode) {
        const confirmRes = await fetch(
          `${API_GATEWAY_URL}/providers/${providerId}/mark-registration-paid`,
          {
            method: "POST",
            headers: authHeaders(),
          }
        );

        if (!confirmRes.ok) {
          throw new Error(
            "Unable to confirm test-mode registration payment"
          );
        }

        const confirmData = await confirmRes.json();

        finishRegistration(confirmData.activation_link);
        return;
      }

        console.log("KEY",
          process.env.NEXT_PUBLIC_RAZORPAY_KEY
        );

        console.log(
          "WINDOW RAZORPAY",
          window.Razorpay
        );
      const options: RazorpayOptions = {

        key:
          process.env
            .NEXT_PUBLIC_RAZORPAY_KEY || "",

        amount:
          data.amount,

        currency: "INR",

        name: "OccasionX",

        description:
          "Provider Registration Fee",

        order_id:
          data.order_id,

          prefill: {
          contact: "9999999999",
          email: "test@example.com",
          name: "Test Provider"
        },

        modal: {
        ondismiss: () => {
          console.log(
            "Checkout closed"
          );
        }
      },

        handler: async (response) => {

        console.log(
          "PAYMENT HANDLER CALLED",
          response
        );

        const providerId =
          localStorage.getItem(
            "provider_id"
          );

        console.log(
          "VERIFYING PAYMENT..."
        );

        const verifyRes =
          await fetch(
            `${API_GATEWAY_URL}/providers/${providerId}/verify-registration-payment`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...authHeaders(),
              },
              body: JSON.stringify(
                response
              )
            }
          );

        console.log(
          "VERIFY RESPONSE STATUS",
          verifyRes.status
        );

        console.log(
          "PAYMENT VERIFIED - finishing up"
        );

        finishRegistration();

    }
  };
      console.log(
      "RAZORPAY OPTIONS",
      JSON.stringify(options, null, 2)
    );
      const razorpay =
      new window.Razorpay(
        options
      );

  razorpay.on(
    "payment.failed",
    (
      response: RazorpayErrorResponse
    ) => {

    console.log(
      "PAYMENT FAILED",
      response
    );

    toast.error(
      response.error.description
    );
  }
);
      razorpay.open();

    } catch (error: unknown) {

  if (axios.isAxiosError(error)) {

    toast.error(
      error.response?.data?.detail ||
      error.message
    );

  } else {

    toast.error(
      "Unable to initiate payment"
    );

  }
}
  };
  const registrationFee =
    process.env
      .NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"
      ? 1
      : 999;

  if (paymentComplete) {
    return (
      <div className="bg-white rounded-3xl shadow p-10 text-center">
        <div className="text-5xl mb-4">📧</div>

        <h1 className="text-3xl font-bold text-[#1F2937]">
          Almost there!
        </h1>

        <p className="mt-3 text-gray-500 max-w-md mx-auto">
          Your registration fee payment is complete. We&apos;ve sent an
          activation link to your email - please open it to activate
          your provider account. You&apos;ll need to activate before
          you can log in.
        </p>

        {activationLink && (
          <div className="mt-6 max-w-md mx-auto text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700">
              Test mode - no real email was sent. Activate your
              account here:
            </p>
            <a
              href={activationLink}
              className="mt-2 inline-block text-sm font-semibold text-[#1E3A8A] break-all underline"
            >
              {activationLink}
            </a>
          </div>
        )}

        <button
          onClick={() => router.push("/provider/login")}
          className="
            mt-8
            w-full
            bg-[#1E3A8A]
            hover:bg-[#182E6E]
            text-white
            py-4
            rounded-xl
            font-semibold
          "
        >
          Go to Provider Login
        </button>
      </div>
    );
  }

  return (

    <div className="bg-white rounded-3xl shadow p-10">

      <h1 className="text-3xl font-bold text-[#1F2937]">
        Provider Registration Fee
      </h1>

      <p className="mt-3 text-gray-500">
        Complete your onboarding by paying
        the one-time provider registration fee.
      </p>

      <div className="mt-8 text-center">

        <div className="text-6xl font-bold text-[#1E3A8A]">
          ₹{registrationFee}
        </div>

        <p className="mt-2 text-gray-500">
          One-time fee
        </p>

        <button
          onClick={payNow}
          className="
            mt-8
            w-full
            bg-[#1E3A8A]
            hover:bg-[#182E6E]
            text-white
            py-4
            rounded-xl
            font-semibold
          "
        >
          Pay ₹{registrationFee} & Complete Registration
        </button>

      </div>

    </div>
  );
}
