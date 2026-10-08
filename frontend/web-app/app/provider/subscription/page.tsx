"use client";
import { API_GATEWAY_URL } from "@/lib/apiClient";

import { useEffect } from "react";
import { RazorpayOptions } from "@/types/razorpay";
import { useRouter } from "next/navigation";

export default function SubscriptionPage() {
    const router = useRouter();
    
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

        alert(
          "Provider not found"
        );

        return;
      }

      const res = await fetch(
        `${API_GATEWAY_URL}/providers/${providerId}/registration-payment`,
        {
          method: "POST",
        }
      );

     if (!res.ok) {
  throw new Error(
    "Unable to create Razorpay order"
  );
}

const data =
  await res.json();

console.log("ORDER DATA", data);

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

        handler: async (
          response
        ) => {

          console.log(
            "Payment Success",
            response
          );

          alert(
            "Payment Successful"
          );
          router.push(
                "/provider/dashboard"
);

          // call backend verification endpoint here
        },
      };

      if (!window.Razorpay) {
  alert(
    "Razorpay SDK not loaded"
  );
  return;
}
      const razorpay =
        new window.Razorpay(
          options
        );

      razorpay.open();

    } catch (error) {

      console.error(error);

      alert(
        "Payment initiation failed"
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-10">

      <div className="bg-white rounded-3xl shadow p-8">

        <h1 className="text-3xl font-bold">
          Become a Verified Partner
        </h1>

        <p className="mt-3 text-gray-500">
          One-time registration fee
        </p>

        <div className="mt-6 text-5xl font-bold">
          ₹999
        </div>

        <button
          onClick={payNow}
          className="
            mt-8
            w-full
            bg-[#5B756D]
            text-white
            rounded-xl
            py-4
          "
        >
          Pay ₹999
        </button>

      </div>

    </div>
  );
}