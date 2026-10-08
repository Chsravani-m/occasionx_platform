"use client";

import TermsDocument, {
  TermsSection,
} from "@/components/legal/TermsDocument";

const SECTIONS: TermsSection[] = [
  {
    heading: "Introduction",
    intro:
      "OccasionX (\"the Platform\"), operated by Neocon Technologies, respects your privacy. This Privacy Policy explains what information we collect, how we use it, and the choices you have.",
  },
  {
    heading: "Information We Collect",
    items: [
      "Account information: name, email address, phone number, and password (stored hashed, never in plain text).",
      "Booking details: event date, location, guest count, service preferences and any notes you add.",
      "Payment information: processed directly by Razorpay, our payment gateway partner. OccasionX does not store your card, UPI or bank account details.",
      "Provider information (for service providers): business details, KYC documents, bank account details for payouts.",
      "Communications: messages sent through Help Center, support email or WhatsApp booking notifications.",
      "Usage data: pages visited, searches performed and device/browser information, used to keep the Platform working correctly.",
    ],
  },
  {
    heading: "How We Use Your Information",
    items: [
      "To create and manage your account.",
      "To process bookings, payments and provider payouts.",
      "To send booking confirmations, status updates and support communications.",
      "To verify provider identity and business details (KYC).",
      "To respond to support requests raised through the Help Center.",
      "To detect and prevent fraud, fake bookings and platform misuse.",
      "To improve and maintain the Platform.",
    ],
  },
  {
    heading: "Sharing of Information",
    intro:
      "We share only what is necessary to deliver the service you've requested:",
    items: [
      "With the service provider you book, we share the details needed to fulfil your booking (name, contact number, event date/location, special requests).",
      "With Razorpay, our payment gateway, to process payments and refunds.",
      "With email/SMS/WhatsApp delivery providers, solely to send booking and account notifications.",
      "With authorities, where required by law or to protect the rights, safety or property of OccasionX, our users or the public.",
    ],
    outro: "We do not sell your personal data to third parties.",
  },
  {
    heading: "Cookies & Local Storage",
    intro:
      "OccasionX uses browser local storage to keep you signed in between visits and to remember items in your cart. We do not use third-party advertising or tracking cookies.",
  },
  {
    heading: "Data Storage & Security",
    items: [
      "Passwords are stored using industry-standard hashing, never in plain text.",
      "Payment details never touch OccasionX servers - they are handled directly by Razorpay, a PCI-DSS compliant payment gateway.",
      "Access to personal data is restricted to authorized personnel who need it to perform their role.",
    ],
  },
  {
    heading: "Data Retention",
    intro:
      "We retain account and booking data for as long as your account remains active, and for a reasonable period afterward as required for legal, accounting, tax and dispute-resolution purposes.",
  },
  {
    heading: "Your Rights",
    items: [
      "You can access and update most of your profile information at any time from your account.",
      "You can request deletion of your account by contacting support@occasionx.com.",
      "You can opt out of promotional communications while continuing to receive essential booking/account notifications.",
    ],
  },
  {
    heading: "Children's Privacy",
    intro:
      "OccasionX is not directed at children. Users must be at least 18 years of age, or use the Platform only under parental or legal guardian supervision, consistent with our Terms & Conditions.",
  },
  {
    heading: "Changes to This Policy",
    intro:
      "We may update this Privacy Policy from time to time. Material changes will be reflected by an updated date on this page.",
  },
  {
    heading: "Contact Us",
    intro:
      "Questions about this Privacy Policy or your data can be directed to:",
    outro: "support@occasionx.com | +91 98765 43210",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <TermsDocument
      title="Privacy Policy"
      backHref="/"
      backLabel="Back to Home"
      sections={SECTIONS}
    />
  );
}
