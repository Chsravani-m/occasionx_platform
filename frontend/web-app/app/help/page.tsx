import Link from "next/link";
import { Mail, Phone, Clock, HelpCircle } from "lucide-react";

const FAQS = [
  {
    q: "How do I book a service on OccasionX?",
    a: "Search or browse by category, open a provider's details page, choose a package or service, and follow the booking flow through to payment. You'll see the booking under My Bookings once it's confirmed.",
  },
  {
    q: "How do I become a service provider on OccasionX?",
    a: "Head to Partner With Us to register your business. You'll set up your listing, pricing and (after a one-time registration fee) get an activation email to start receiving bookings.",
  },
  {
    q: "I forgot my password. What do I do?",
    a: "On the Sign In page, select 'Forgot password?' and enter your account email. We'll send a link to reset it.",
  },
  {
    q: "How do refunds and cancellations work?",
    a: "Cancellation terms depend on the individual provider and how close to the event date you cancel. Contact the provider directly through your booking, or reach out to us at the email below if you need help.",
  },
  {
    q: "Is my payment secure?",
    a: "All payments are processed through Razorpay, a PCI-DSS compliant payment gateway. OccasionX never stores your card or bank details.",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F2] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="text-[#1E3A8A]" size={28} />
          <h1 className="text-3xl font-bold text-[#1F2937]">Help Center</h1>
        </div>
        <p className="text-gray-600 mb-10">
          Answers to common questions, and how to reach us if you need more help.
        </p>

        <div className="space-y-4 mb-12">
          {FAQS.map((item) => (
            <div
              key={item.q}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-6"
            >
              <h2 className="font-semibold text-[#1F2937] mb-2">{item.q}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
          <h2 className="font-semibold text-[#1F2937] mb-4">Still need help?</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-[#1E3A8A]" />
              <a href="mailto:support@occasionx.com" className="hover:underline">
                support@occasionx.com
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-[#1E3A8A]" />
              <a href="tel:+919876543210" className="hover:underline">
                +91 98765 43210
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-[#1E3A8A]" />
              <span>Support Hours: 9 AM – 7 PM IST (Mon–Sat)</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-center">
          <Link href="/" className="text-[#1E3A8A] hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
