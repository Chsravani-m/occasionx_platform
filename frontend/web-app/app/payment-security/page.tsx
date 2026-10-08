"use client";

import TermsDocument, {
  TermsSection,
} from "@/components/legal/TermsDocument";

const SECTIONS: TermsSection[] = [
  {
    heading: "Payment Gateway",
    intro:
      "All payments on OccasionX - Service Provider Fees, Application Fees and the Prime membership fee - are processed through Razorpay, a PCI-DSS compliant payment gateway used widely across India.",
  },
  {
    heading: "What OccasionX Does and Doesn't Store",
    items: [
      "OccasionX never stores your card number, CVV, UPI ID or bank account details - these are handled entirely within Razorpay's secure checkout.",
      "OccasionX stores only the outcome of a payment (success/failure, amount, order reference) needed to confirm your booking.",
    ],
  },
  {
    heading: "Combined & Split Payments",
    intro:
      "Where a booking involves multiple providers, or a combination of the Service Provider Fee and an OccasionX Application Fee, these may be collected together as a single Razorpay charge and then settled to the correct parties on the backend - you are never asked to make separate manual transfers.",
  },
  {
    heading: "Provider Payouts",
    intro:
      "Providers with a linked payout account receive their share of a booking directly through Razorpay Route, OccasionX's payout infrastructure, after the applicable settlement cycle.",
  },
  {
    heading: "Fraud Prevention",
    items: [
      "All transactions are screened by Razorpay's fraud-detection systems.",
      "OccasionX monitors for suspicious booking or payment patterns and may hold or reject transactions that appear fraudulent.",
    ],
  },
  {
    heading: "Refunds",
    intro:
      "Approved refunds are issued to the original payment method via Razorpay. See the Refund & Cancellation Policy for eligibility details.",
  },
  {
    heading: "Reporting an Issue",
    intro:
      "If you notice an unauthorized or incorrect charge, contact us immediately:",
    outro: "support@occasionx.com | +91 98765 43210",
  },
];

export default function PaymentSecurityPage() {
  return (
    <TermsDocument
      title="Payment & Security"
      backHref="/"
      backLabel="Back to Home"
      sections={SECTIONS}
    />
  );
}
