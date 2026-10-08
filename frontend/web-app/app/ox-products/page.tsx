import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center px-6 py-24">
      <div className="max-w-xl text-center">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold bg-[#C89B3C]/10 text-[#C89B3C] mb-6">
          OXProducts
        </span>

        <h1 className="text-4xl font-bold text-[#1F2937] mb-4">
          Coming Soon
        </h1>

        <p className="text-[#1E3A8A] text-lg mb-10">
          We&apos;re building something new for OccasionX. Check back soon.
        </p>

        <Link
          href="/"
          className="inline-block bg-[#1E3A8A] hover:bg-[#182E6E] text-white px-6 py-3 rounded-xl font-semibold transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
