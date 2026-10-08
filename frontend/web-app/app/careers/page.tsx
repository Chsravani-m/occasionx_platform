import { Briefcase, Mail } from "lucide-react";

const VALUES = [
  "We're a small, product-focused team building the event-planning marketplace we wished existed.",
  "We move fast, ship real features, and care about getting the details right for both customers and providers.",
  "We're remote-friendly and hire for ownership, not job titles.",
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F2] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="text-[#1E3A8A]" size={28} />
          <h1 className="text-3xl font-bold text-[#1F2937]">Careers at OccasionX</h1>
        </div>

        <p className="text-gray-600 mb-10 leading-relaxed">
          We don't have specific open roles listed right now, but we're
          always happy to hear from people who want to help build OccasionX.
        </p>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-[#1F2937] mb-4">What it's like working here</h2>
          <ul className="space-y-3 text-sm text-gray-600 leading-relaxed list-disc pl-5">
            {VALUES.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
          <h2 className="font-semibold text-[#1F2937] mb-3">Interested?</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Send us your resume and a short note on what you'd want to work
            on, and we'll reach out if there's a fit.
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <Mail size={18} className="text-[#1E3A8A]" />
            <a href="mailto:careers@occasionx.com" className="hover:underline">
              careers@occasionx.com
            </a>
          </div>
        </div>

        <div className="mt-8 text-sm text-center">
          <a href="/" className="text-[#1E3A8A] hover:underline">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
