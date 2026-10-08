"use client";

import TermsDocument, {
  TermsSection,
} from "@/components/legal/TermsDocument";

const SECTIONS: TermsSection[] = [
  {
    heading: "Purpose of This Agreement",
    intro:
      "This Service Provider Agreement governs the ongoing commercial relationship between OccasionX and registered service providers, in addition to the Service Provider Registration Terms & Conditions accepted at sign-up.",
  },
  {
    heading: "Independent Contractor Status",
    intro:
      "Providers are independent businesses, not employees, agents or representatives of OccasionX. OccasionX acts as a marketplace connecting providers with customers and is not a party to the service delivered.",
  },
  {
    heading: "Commission & Fees",
    items: [
      "OccasionX may charge a commission or platform fee on completed bookings, deducted before settlement.",
      "Commission rates may vary by category and will be communicated through the Provider Dashboard.",
      "Where an OccasionX Application Fee is charged to the customer separately, it does not reduce the provider's payout.",
    ],
  },
  {
    heading: "Payouts & Settlement",
    items: [
      "Payouts are released to the provider's linked payout account after successful completion of the service and any applicable dispute window.",
      "Settlement cycles may vary (for example, T+3 or T+7 business days) as specified in the Provider Dashboard.",
      "Providers are responsible for keeping their bank/payout details accurate and up to date.",
    ],
  },
  {
    heading: "Listing & Content Standards",
    items: [
      "Pricing, photographs and service descriptions must be accurate and kept up to date.",
      "Availability shown on the Platform should reflect real capacity.",
      "False or misleading listing information may lead to listing removal or account suspension.",
    ],
  },
  {
    heading: "Booking Acceptance & Cancellation",
    items: [
      "Providers should respond to booking requests promptly and honour confirmed bookings.",
      "Cancellations by the provider should be limited to genuinely unavoidable situations, with the customer notified as early as possible.",
      "Repeated provider-side cancellations may affect search ranking or account standing.",
    ],
  },
  {
    heading: "Reviews & Ratings Integrity",
    intro:
      "Providers may not manipulate ratings, purchase fake reviews, or offer incentives in exchange for positive reviews. OccasionX may investigate and remove suspicious review activity.",
  },
  {
    heading: "Term & Termination",
    intro:
      "This Agreement remains in effect while the provider's account is active. Either party may end the relationship at any time; OccasionX may additionally suspend or terminate a provider account for fraud, repeated policy violations, or non-performance, consistent with the Service Provider Registration Terms & Conditions.",
  },
  {
    heading: "Dispute Resolution",
    intro:
      "Disputes arising from this Agreement should first be raised through OccasionX support. OccasionX may facilitate communication between providers and customers but is not obligated to adjudicate every dispute.",
    outro: "support@occasionx.com | +91 98765 43210",
  },
];

export default function ProviderAgreementPage() {
  return (
    <TermsDocument
      title="Service Provider Agreement"
      backHref="/"
      backLabel="Back to Home"
      sections={SECTIONS}
    />
  );
}
