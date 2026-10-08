"use client";

import TermsDocument, {
  TermsSection,
} from "@/components/legal/TermsDocument";

const SECTIONS: TermsSection[] = [
  {
    heading: "Overview",
    intro:
      "Every booking on OccasionX is made up of two components: the Service Provider Fee (the amount charged by the provider for the booked service) and, for some bookings, an OccasionX Application Fee. This policy explains how each is handled on cancellation.",
  },
  {
    heading: "Customer-Initiated Cancellations",
    items: [
      "Refund eligibility for the Service Provider Fee depends on the individual provider's own cancellation policy, which may vary by provider and how close to the event date you cancel.",
      "Cancellations made well in advance of the event date are more likely to be eligible for a fuller refund than last-minute cancellations.",
      "To cancel a confirmed booking, contact the provider directly through your booking, or reach out to OccasionX support if you need help.",
    ],
  },
  {
    heading: "Provider-Initiated Cancellations",
    intro:
      "If a provider rejects or cancels a confirmed booking, the customer receives a full refund of the amount paid to that provider for the booking.",
  },
  {
    heading: "OccasionX Application Fee",
    intro:
      "The Application Fee (where charged) covers OccasionX's platform and booking-facilitation costs and is generally non-refundable once a booking is confirmed, except where the provider is responsible for the cancellation.",
  },
  {
    heading: "Unpaid / Expired Bookings",
    intro:
      "Bookings that are not paid for within the allotted payment window automatically move to an Expired status, and any date held for that booking is released. No charge is made and no refund is necessary for an expired booking, since payment was never completed.",
  },
  {
    heading: "Refund Processing",
    items: [
      "Approved refunds are issued to the original payment method through Razorpay, our payment gateway.",
      "Processing time is typically 5-7 business days, though it may vary depending on your bank or card issuer.",
    ],
  },
  {
    heading: "Disputes",
    intro:
      "If you believe a refund was calculated incorrectly, or a provider is not honouring their cancellation policy, raise it through the Help Center or by emailing support@occasionx.com and we'll help mediate.",
  },
];

export default function RefundPolicyPage() {
  return (
    <TermsDocument
      title="Refund & Cancellation Policy"
      backHref="/"
      backLabel="Back to Home"
      sections={SECTIONS}
    />
  );
}
