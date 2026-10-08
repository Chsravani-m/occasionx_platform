// The canonical `window.Razorpay` type (constructor signature, options
// shape, and the `open`/`on` instance methods) lives in
// src/types/razorpay.d.ts - it's the richer of the two definitions
// (SubscriptionSection.tsx needs the `on("payment.failed", ...)`
// method) and is declared globally, so it applies here too without a
// second `declare global` block. Two global augmentations of the same
// interface must be textually identical or TS errors ("Subsequent
// property declarations must have the same type"), so this file no
// longer declares its own.
//
// `razorpay_order_id`/`razorpay_signature` are optional here (matching
// the real Razorpay checkout.js response and src/types/razorpay.d.ts)
// because Razorpay only guarantees them when the checkout was opened
// with an `order_id` - which every caller in this codebase does, so
// call sites use a non-null assertion when forwarding them to the
// backend verify endpoints.
export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

let loadingPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve) => {
    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });

  return loadingPromise;
}
