"use client";

import TermsDocument, {
  TermsSection,
} from "@/components/legal/TermsDocument";

const SECTIONS: TermsSection[] = [
  {
    heading: "Membership Tiers",
    intro: "OccasionX customer accounts fall into one of two tiers:",
    items: [
      "Free accounts can browse, search, build packages and book normally. A small OccasionX booking service charge applies per booking to help cover platform costs.",
      "Prime membership is an optional, one-time paid upgrade available at registration. Prime members skip the per-booking service charge entirely on future bookings.",
    ],
  },
  {
    heading: "How the Booking Service Charge Works",
    intro:
      "For free-tier customers, the booking service charge is collected at the time a booking is created, before the booking is confirmed with the provider. It is separate from the Service Provider Fee paid to the provider for the actual service.",
  },
  {
    heading: "Prime Membership Fee",
    intro:
      "The Prime membership fee is a one-time payment made during registration and is not a recurring subscription. The exact fee is shown on the registration screen at the time of sign-up.",
  },
  {
    heading: "Eligibility & Enrollment",
    items: [
      "Prime membership is offered to customer accounts at registration.",
      "Membership status (is_paid_member) is tied to your account and is checked automatically at booking time - there's nothing further to activate.",
    ],
  },
  {
    heading: "Refunds on Membership Fees",
    intro:
      "The Prime membership fee follows the same Refund & Cancellation Policy principles applied to platform fees generally - please refer to the Refund & Cancellation Policy for details, or contact support if you believe you were charged in error.",
  },
  {
    heading: "Changes to This Policy",
    intro:
      "OccasionX may adjust membership tiers, fees or benefits from time to time. Material changes will be reflected by an updated date on this page.",
  },
  {
    heading: "Contact Us",
    intro: "Questions about your membership status can be directed to:",
    outro: "support@occasionx.com | +91 98765 43210",
  },
];

export default function MembershipPolicyPage() {
  return (
    <TermsDocument
      title="User Membership Policy"
      backHref="/"
      backLabel="Back to Home"
      sections={SECTIONS}
    />
  );
}
