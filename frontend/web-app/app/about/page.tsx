import { Sparkles, Target, ShieldCheck, Users } from "lucide-react";

const VALUES = [
  {
    icon: Target,
    title: "Plan less, celebrate more",
    body: "OccasionX exists so that planning an event doesn't have to be a second job. Search, compare and book verified providers for every part of your celebration in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Verified providers",
    body: "Every provider on the Platform is verified before they can list services, so you're booking with real, accountable businesses - not an anonymous listing.",
  },
  {
    icon: Users,
    title: "Built for both sides",
    body: "Customers get a single place to plan an entire event. Providers get real bookings, an activation flow, and a dashboard to manage services, pricing and payouts.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F2] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="text-[#1E3A8A]" size={28} />
          <h1 className="text-3xl font-bold text-[#1F2937]">About OccasionX</h1>
        </div>

        <p className="text-gray-600 mb-10 leading-relaxed">
          OccasionX is an event-services marketplace that connects customers
          planning weddings, birthdays, corporate events and every occasion
          in between with verified venues, caterers, photographers, decorators
          and other service providers - all searchable, comparable and
          bookable from one platform.
        </p>

        <div className="space-y-4 mb-12">
          {VALUES.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex gap-4"
            >
              <item.icon className="text-[#1E3A8A] shrink-0 mt-1" size={22} />
              <div>
                <h2 className="font-semibold text-[#1F2937] mb-2">
                  {item.title}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
          <h2 className="font-semibold text-[#1F2937] mb-2">Who runs OccasionX</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            OccasionX is operated by Neocon Technologies. If you'd like to
            know more about the Platform, or you're a provider interested in
            listing your services, reach out through our{" "}
            <a href="/contact" className="text-[#1E3A8A] hover:underline">
              Contact page
            </a>{" "}
            or head straight to{" "}
            <a href="/provider/register" className="text-[#1E3A8A] hover:underline">
              Partner With Us
            </a>
            .
          </p>
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
