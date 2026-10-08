import { TermsSection } from "./TermsDocument";

// Shared by app/terms/provider/page.tsx (standalone route) and
// TermsModal (opened in-page from the registration wizard) so the
// copy only lives in one place.
export const PROVIDER_TERMS_SECTIONS: TermsSection[] = [
  {
    heading: "Eligibility",
    intro: "Providers must:",
    items: [
      "Be at least 18 years old.",
      "Be legally authorized to provide services in India.",
      "Hold applicable licenses, registrations, or certifications where required.",
      "Possess a valid PAN.",
      "Provide GST registration details where applicable.",
    ],
  },
  {
    heading: "Business Verification",
    intro: "Providers shall submit:",
    items: [
      "Aadhaar/PAN",
      "Business registration (if applicable)",
      "GST certificate (where applicable)",
      "Bank account details",
      "Address proof",
      "Service portfolio",
      "Photographs",
      "Experience details",
    ],
    outro: "OccasionX may conduct KYC verification before approval.",
  },
  {
    heading: "Registration Approval",
    intro:
      "Registration does not guarantee listing. OccasionX reserves the right to:",
    items: ["Reject", "Suspend", "Remove", "Re-verify"],
    outro:
      "any provider without prior notice if information is false or incomplete.",
  },
  {
    heading: "Provider Responsibilities",
    intro: "Providers agree to:",
    items: [
      "Deliver services professionally.",
      "Maintain agreed timelines.",
      "Provide quality services.",
      "Maintain insurance where legally required.",
      "Follow local laws.",
      "Maintain hygiene and safety standards.",
      "Ensure qualified staff perform services.",
    ],
  },
  {
    heading: "Listing Accuracy",
    intro: "Providers shall ensure:",
    items: [
      "Correct pricing.",
      "Updated photographs.",
      "Accurate descriptions.",
      "Genuine package details.",
      "Availability calendar.",
    ],
    outro: "False information may lead to account suspension.",
  },
  {
    heading: "Pricing",
    intro: "Providers are responsible for:",
    items: [
      "Service pricing.",
      "Discounts.",
      "Taxes.",
      "Hidden charges (not permitted).",
    ],
    outro:
      "OccasionX may recommend pricing but does not control provider rates unless otherwise specified.",
  },
  {
    heading: "Commission",
    intro: "Providers agree that:",
    items: [
      "OccasionX may charge a commission or platform fee.",
      "Commission rates may vary by category.",
      "Updated commission structures will be communicated through the Provider Dashboard.",
    ],
  },
  {
    heading: "Booking Acceptance",
    intro: "Providers must:",
    items: [
      "Respond promptly.",
      "Honour confirmed bookings.",
      "Avoid unnecessary cancellations.",
      "Notify users immediately in unavoidable situations.",
    ],
    outro: "Repeated cancellations may affect rankings or account status.",
  },
  {
    heading: "Payments & Settlement",
    intro: "Payments will be settled after:",
    items: [
      "Successful completion of services.",
      "Deduction of applicable fees.",
      "Verification of disputes (if any).",
    ],
    outro:
      "Settlement cycles may vary (e.g., T+3 or T+7 business days), as specified in the Provider Dashboard.",
  },
  {
    heading: "Cancellation",
    intro: "Providers shall not:",
    items: [
      "Cancel confirmed bookings without valid reasons.",
      "Demand offline payments.",
      "Force customers to cancel bookings.",
    ],
    outro: "Penalties may apply.",
  },
  {
    heading: "Reviews",
    intro: "Providers may not:",
    items: [
      "Manipulate ratings.",
      "Buy fake reviews.",
      "Offer incentives for positive reviews.",
    ],
    outro: "OccasionX may investigate suspicious review activity.",
  },
  {
    heading: "Code of Conduct",
    intro: "Providers shall:",
    items: [
      "Maintain professional behaviour.",
      "Wear proper identification where applicable.",
      "Respect customer privacy.",
      "Avoid abusive language.",
      "Avoid discrimination.",
      "Follow safety protocols.",
    ],
  },
  {
    heading: "Platform Exclusivity (Optional)",
    intro:
      "Providers shall not encourage users to bypass the OccasionX platform for bookings initiated through OccasionX for a defined period, if such a policy is adopted.",
  },
  {
    heading: "Intellectual Property",
    intro:
      "Providers grant OccasionX a non-exclusive license to display:",
    items: [
      "Business name",
      "Logos",
      "Images",
      "Videos",
      "Promotional materials",
    ],
    outro: "for marketing and platform operations.",
  },
  {
    heading: "Insurance & Compliance",
    intro: "Providers are solely responsible for:",
    items: [
      "Employee safety",
      "Insurance coverage",
      "Labour law compliance",
      "GST compliance",
      "Local permits",
      "Fire and safety regulations",
    ],
  },
  {
    heading: "Liability",
    intro: "Providers shall indemnify OccasionX against claims arising from:",
    items: [
      "Poor service delivery",
      "Property damage",
      "Injury caused by negligence",
      "Regulatory violations",
      "Intellectual property infringement",
    ],
  },
  {
    heading: "Suspension & Termination",
    intro: "OccasionX may suspend or terminate providers for:",
    items: [
      "Fraud",
      "Fake reviews",
      "Non-performance",
      "Customer complaints",
      "Illegal activities",
      "Misrepresentation",
      "Repeated cancellations",
      "Violation of platform policies",
    ],
  },
  {
    heading: "Dispute Resolution",
    intro:
      "Disputes between users and providers should first be raised through OccasionX support.",
    outro:
      "OccasionX may facilitate communication but is not obligated to adjudicate every dispute. Platform operators commonly define themselves as intermediaries rather than direct service providers.",
  },
];
