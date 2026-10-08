"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../services/authApi";
import { AxiosError } from "axios";
import Link from "next/link";
import { Info } from "lucide-react";
import {
  createMembershipOrder,
  verifyMembershipPayment,
  confirmTestMembershipPayment,
} from "@/services/membershipApi";
import {
  loadRazorpayScript,
  type RazorpaySuccessResponse,
} from "@/utils/razorpay";
import {
  hasAcceptedUserTerms,
  acceptUserTerms,
  clearUserTermsAcceptance,
} from "@/utils/terms";
import TermsModal from "@/components/legal/TermsModal";
import { USER_TERMS_SECTIONS } from "@/components/legal/userTermsContent";

  const RegisterPage: React.FC = () => {

  const [accountType, setAccountType] = useState<"user" | "provider">("user");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  // Not a checkbox - reflects whether the person has opened the Terms
  // & Conditions dialog and clicked "I Agree" at the end of it. The
  // dialog renders in-page now (see TermsModal below) rather than in
  // a separate tab, so this just mirrors hasAcceptedUserTerms()
  // directly - no cross-tab storage-event listening needed anymore.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [wantsPaidMembership, setWantsPaidMembership] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setAcceptedTerms(hasAcceptedUserTerms());
  }, []);

  // The Terms & Conditions link opens in a new tab (target="_blank"),
  // and "I Agree" there auto-redirects that same tab back to
  // /register. That's a fresh page load, so without this the newly
  // redirected tab shows a blank form - if the person tries to
  // register from it, they hit "Please fill in all required fields."
  // even though they'd already filled everything in on their original
  // tab. sessionStorage is copied into new tabs opened via
  // target="_blank"/window.open (per the HTML spec), so the terms tab
  // inherits whatever was last saved here and can restore it on
  // restart. Mirrors the same fix already applied to the provider
  // onboarding wizard's Step2Business terms link.
  const DRAFT_KEY = "ox_user_register_draft";
  const isFirstPersistRun = useRef(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);

      if (!raw) return;

      const draft = JSON.parse(raw);

      if (draft.accountType) setAccountType(draft.accountType);
      if (draft.fullName) setFullName(draft.fullName);
      if (draft.email) setEmail(draft.email);
      if (draft.mobile) setMobile(draft.mobile);
      if (draft.password) setPassword(draft.password);
      if (draft.confirmPassword) setConfirmPassword(draft.confirmPassword);
      if (draft.wantsPaidMembership) setWantsPaidMembership(true);
    } catch (e) {
      console.error("Failed to restore registration draft:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstPersistRun.current) {
      isFirstPersistRun.current = false;
      return;
    }

    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        accountType,
        fullName,
        email,
        mobile,
        password,
        confirmPassword,
        wantsPaidMembership,
      })
    );
  }, [
    accountType,
    fullName,
    email,
    mobile,
    password,
    confirmPassword,
    wantsPaidMembership,
  ]);

  const handleAccountTypeChange = (type: "user" | "provider") => {
    setAccountType(type);

    if (type === "provider") {
      router.push("/provider/register");
    }
  };

  // Runs the paid-membership payment right after registration when
  // the "Register as a paid user" checkbox was ticked. Deliberately
  // never throws - if the payment fails or the customer cancels the
  // Razorpay popup, the account just stays a free user (the DB
  // default), and registration itself has already succeeded either
  // way.
  const payMembershipFee = async (
    userId: string
  ): Promise<string> => {
    try {
      const order = await createMembershipOrder(userId);

      if (order.test_mode) {
        await confirmTestMembershipPayment(userId, order.order_id);

        return "Registration successful and paid membership activated!";
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        return (
          "Registration successful, but the payment gateway couldn't " +
          "load - you've been registered as a free user for now."
        );
      }

      return await new Promise<string>((resolve) => {
        const razorpay = new window.Razorpay({
          key: order.razorpay_key_id,
          amount: order.amount,
          currency: order.currency,
          order_id: order.order_id,
          name: "OccasionX",
          description: "Paid Membership",
          prefill: {
            name: fullName,
            email,
          },
          theme: {
            color: "#1E3A8A",
          },
          handler: async (response: RazorpaySuccessResponse) => {
            try {
              await verifyMembershipPayment(userId, {
                // Non-null: checkout was opened with order_id, so
                // Razorpay always includes these in the success callback.
                razorpay_order_id: response.razorpay_order_id!,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature!,
              });

              resolve(
                "Registration successful and paid membership activated!"
              );
            } catch (err) {
              console.error(err);
              resolve(
                "Registration successful, but the membership payment " +
                  "couldn't be confirmed - you've been registered as " +
                  "a free user for now."
              );
            }
          },
          modal: {
            ondismiss: () => {
              resolve(
                "Registration successful. Payment was cancelled, so " +
                  "you've been registered as a free user."
              );
            },
          },
        });

        razorpay.open();
      });
    } catch (err) {
      console.error(err);

      return (
        "Registration successful, but starting the membership payment " +
        "failed - you've been registered as a free user for now."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !mobile || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }
    const digitsOnly = mobile.replace(/\D/g, "");
    const localNumber =
      digitsOnly.length === 12 && digitsOnly.startsWith("91")
        ? digitsOnly.slice(2)
        : digitsOnly;
    if (localNumber.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and Confirm Password must match.");
      return;
    }
    if (!acceptedTerms) {
      setError(
        "Please open and agree to the Terms & Conditions before " +
        "registering."
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = (await register(
        fullName,
        email,
        mobile,
        password
      )) as { id?: string };

      let successMessage =
        "Registration successful. Please verify your email or mobile number to activate your account.";

      if (wantsPaidMembership && response?.id) {
        const membershipMessage = await payMembershipFee(response.id);

        successMessage = `${membershipMessage} Please verify your email or mobile number to activate your account.`;
      }

      // Acceptance is tracked per-browser, not per-account - clear it
      // so the next person to register on this browser has to agree
      // again rather than inheriting someone else's acceptance.
      clearUserTermsAcceptance();
      sessionStorage.removeItem(DRAFT_KEY);

      setSuccess(successMessage);

    setTimeout(() => {
      router.push("/signin");
    }, 3000);
    } catch (err: unknown) {

  const error = err as AxiosError<{
    detail?: string;
    message?: string;
  }>;

  const message =
    error.response?.data?.detail ??
    error.response?.data?.message ??
    "Registration Failed";

  setError(message);
}
  finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

      <form
        className="
          w-full
          max-w-md
          bg-white
          border border-[#E5E7EB]
          rounded-2xl
          shadow-lg
          px-6
          py-8
          space-y-6
        "
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <img src="/AppLogo%201.png" alt="OccasionX Logo" className="h-16 mb-4" />
          <h2 className="text-xl font-bold text-[#1F2937] mb-1">Create your OccasionX account</h2>

          <p className="text-xs text-gray-500 text-center">
            Sign up to plan and manage all your events in one place.
          </p>
        </div>
    
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#1F2937] block mb-2">
              I am registering as a
            </label>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-[#1F2937] cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  className="accent-[#1E3A8A]"
                  checked={accountType === "user"}
                  onChange={() => handleAccountTypeChange("user")}
                />
                User
              </label>

              <label className="flex items-center gap-2 text-sm text-[#1F2937] cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  className="accent-[#1E3A8A]"
                  checked={accountType === "provider"}
                  onChange={() => handleAccountTypeChange("provider")}
                />
                Service Provider
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#1F2937]">Full Name</label>
            <input
              type="text"
              className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#1F2937]">Email</label>
            <input
              type="email"
              className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#1F2937]">Mobile Number</label>
            <input
              type="tel"
              className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
              placeholder="+91 XXXXX XXXXX"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#1F2937]">Password</label>
            <input
              type="password"
              className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#1F2937]">Confirm Password</label>
            <input
              type="password"
              className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {accountType === "user" && (
            <div className="flex items-start gap-2 rounded-lg bg-[#F2F3F8] border border-[#B9C1DA] p-3">
              <input
                type="checkbox"
                checked={wantsPaidMembership}
                onChange={(e) => setWantsPaidMembership(e.target.checked)}
                className="mt-1 accent-[#1E3A8A]"
                id="paidMembership"
              />
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="paidMembership"
                  className="text-xs font-medium text-[#1F2937]"
                >
                  Become a prime member
                </label>

                <div className="relative group inline-flex">
                  <Info
                    size={14}
                    className="text-[#6B7280] cursor-help"
                    aria-label="Prime membership details"
                  />

                  <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg bg-[#1F2937] px-3 py-2 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    ₹499 one-time. Skip the per-booking service charge on
                    every future booking. Leave unchecked to register as
                    a free user - free users pay a small service charge
                    each time they book.
                  </div>
                </div>
              </div>
            </div>
          )}

          {acceptedTerms ? (
            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ✓ You've agreed to the Terms & Conditions.
            </div>
          ) : (
            <div className="text-xs text-gray-500 bg-[#F2F3F8] border border-[#B9C1DA] rounded-lg px-3 py-2">
              Please read and agree to our{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="underline text-[#1E3A8A] font-medium"
              >
                Terms & Conditions
              </button>
              {' '}before registering.
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-green-700 bg-green-100 border border-green-300 rounded-lg px-3 py-3">
            {success}
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-[#1E3A8A] hover:bg-[#182E6E] text-white text-sm font-semibold py-2.5 mt-2 flex items-center justify-center gap-2 transition"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
        <div className="text-xs text-gray-500 text-center mt-4">
          Already have an account?{' '}
          <Link href="/signin" className="underline text-[#1E3A8A]">
            Sign In
          </Link>
        </div>
        <div className="text-xs text-gray-500 text-center mt-2">
          Are you a service provider?{' '}
          <Link href="/provider/register" className="underline text-[#1E3A8A]">
            Register as Provider
          </Link>
        </div>
      </form>
      </div>

      <TermsModal
        open={showTermsModal}
        title="User Registration Terms & Conditions"
        sections={USER_TERMS_SECTIONS}
        onAgree={() => {
          acceptUserTerms();
          setAcceptedTerms(true);
        }}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
};

export default RegisterPage;