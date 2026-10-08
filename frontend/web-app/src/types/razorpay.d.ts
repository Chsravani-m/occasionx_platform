export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayErrorResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
  };
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;

    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };

    theme?: {
      color?: string;
    };

    handler: (response: {
      razorpay_payment_id: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    }) => void | Promise<void>;

    modal?: {
      ondismiss?: () => void;
    };
  }

declare global {
  interface Window {
    Razorpay: new (
      options: RazorpayOptions
    ) => {
      open(): void;

      on(
        event: string,
        callback: (
          response: RazorpayErrorResponse
        ) => void
      ): void;
    };
  }
}