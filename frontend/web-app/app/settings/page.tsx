"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/auth";

interface SettingsRowProps {
  href: string;
  label: string;
  external?: boolean;
}

function SettingsRow({ href, label, external }: SettingsRowProps) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex items-center justify-between px-5 py-4 text-sm font-medium text-[#1F2937] hover:bg-[#F8F6F2] transition"
    >
      {label}
      <span className="text-[#9CA3AF]">&rsaquo;</span>
    </Link>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();

    if (!user) {
      router.push("/signin");
      return;
    }

    setName(user.fullName || user.name || user.email || null);
    setChecked(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("provider_id");
    localStorage.removeItem("user_id");

    router.push("/");
  };

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F2]">
        <div className="w-10 h-10 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-[#1F2937]">
            Account Settings
          </h1>

          {name && (
            <p className="mt-2 text-sm text-gray-500">
              Signed in as {name}.
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-[#E5E7EB] divide-y divide-[#E5E7EB] overflow-hidden">
            <SettingsRow href="/profile" label="Profile Information" />
            <SettingsRow href="/my-bookings" label="Your Orders & Bookings" />
            <SettingsRow href="/wishlist" label="Wishlist" />
          </div>

          <h2 className="mt-8 text-sm font-semibold text-[#1F2937] uppercase tracking-wide">
            Legal
          </h2>

          <div className="mt-3 rounded-2xl border border-[#E5E7EB] divide-y divide-[#E5E7EB] overflow-hidden">
            <SettingsRow href="/terms" label="Terms & Conditions" />
            <SettingsRow href="/privacy" label="Privacy Policy" />
            <SettingsRow href="/refund-policy" label="Refund & Cancellation Policy" />
            <SettingsRow href="/payment-security" label="Payment Security" />
          </div>

          <button
            onClick={handleLogout}
            className="mt-8 w-full rounded-full bg-white border border-red-300 text-red-600 text-sm font-semibold py-2.5 hover:bg-red-50 transition"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
