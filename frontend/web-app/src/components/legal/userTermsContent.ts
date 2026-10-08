import { TermsSection } from "./TermsDocument";

// Shared by app/terms/page.tsx (standalone route, e.g. footer link) and
// TermsModal (opened in-page from RegisterPage) so the copy only lives
// in one place.
export const USER_TERMS_SECTIONS: TermsSection[] = [
  {
    heading: "Acceptance of Terms",
    intro:
      "By creating an account on OccasionX, you agree to these Terms & Conditions, the Privacy Policy, Refund Policy, and any additional policies published on the Platform.",
  },
  {
    heading: "Eligibility",
    items: [
      "Users must be at least 18 years of age.",
      "Users below 18 years may use the Platform only under parental or legal guardian supervision.",
      "Users must provide accurate and complete information during registration.",
    ],
  },
  {
    heading: "Account Registration",
    intro: "The User agrees to:",
    items: [
      "Register using valid mobile number and email.",
      "Verify OTP during registration.",
      "Maintain confidentiality of login credentials.",
      "Update profile information whenever changes occur.",
      "Use only one account unless approved by OccasionX.",
    ],
    outro:
      "OccasionX reserves the right to suspend duplicate or fraudulent accounts.",
  },
  {
    heading: "User Responsibilities",
    intro: "Users shall:",
    items: [
      "Provide truthful booking information.",
      "Treat service providers respectfully.",
      "Make payments through approved payment methods.",
      "Cooperate during event execution.",
      "Review services honestly.",
    ],
  },
  {
    heading: "Prohibited Activities",
    intro: "Users shall not:",
    items: [
      "Post false reviews.",
      "Upload illegal, offensive or copyrighted content.",
      "Misuse the platform.",
      "Circumvent OccasionX by soliciting providers directly after connecting through the platform (where prohibited by platform policy).",
      "Attempt unauthorized access.",
      "Create fake bookings.",
      "Harass providers.",
    ],
  },
  {
    heading: "Booking Policy",
    items: [
      "Bookings become confirmed only after payment confirmation.",
      "Providers may accept or decline booking requests where applicable.",
      "Certain services may require advance payment.",
      "Customized packages may have separate cancellation terms.",
    ],
  },
  {
    heading: "Payments",
    intro: "Users agree that:",
    items: [
      "All payments shall be made through OccasionX-approved gateways.",
      "Applicable taxes (GST) will be charged.",
      "Convenience charges may apply.",
      "Prices displayed include only listed services unless otherwise specified.",
    ],
  },
  {
    heading: "Cancellation & Refunds",
    intro: "Refund eligibility depends on:",
    items: [
      "Provider cancellation policy.",
      "Event date.",
      "Package selected.",
      "Force majeure events.",
    ],
    outro: "Processing timelines may vary depending on the payment gateway.",
  },
  {
    heading: "Ratings & Reviews",
    intro:
      "Users may post reviews only after completed bookings. OccasionX reserves the right to remove:",
    items: [
      "Fake reviews",
      "Offensive language",
      "Spam",
      "Defamatory content",
    ],
  },
  {
    heading: "Intellectual Property",
    intro:
      "All logos, content, images, software, trademarks and designs belong to OccasionX or respective owners.",
    outro:
      "Users shall not copy or redistribute platform content without permission.",
  },
  {
    heading: "Limitation of Liability",
    intro:
      "OccasionX acts only as a digital marketplace connecting users and independent service providers. OccasionX is not responsible for:",
    items: [
      "Quality of services",
      "Personal disputes",
      "Delays due to traffic/weather",
      "Provider misconduct",
      "Event cancellation caused by third parties",
    ],
  },
  {
    heading: "Account Suspension",
    intro: "OccasionX may suspend or terminate accounts for:",
    items: [
      "Fraud",
      "Misuse",
      "Fake bookings",
      "Payment fraud",
      "Violation of policies",
    ],
  },
  {
    heading: "Privacy",
    intro:
      "User information will be processed according to the Privacy Policy.",
  },
  {
    heading: "Governing Law",
    intro:
      "These Terms shall be governed by the laws of India. Jurisdiction: Courts at Hyderabad, Telangana.",
  },
];
