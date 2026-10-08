"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/services/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setMessage(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await forgotPassword(email);
      setMessage(
        res.message ||
        "If an account exists for that email, a password reset link has been sent."
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-lg px-6 py-8 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img src="/AppLogo%201.png" alt="OccasionX Logo" className="h-16 mb-4" />
          <h2 className="text-2xl font-bold text-[#1F2937]">Forgot your password?</h2>
          <p className="text-sm text-gray-500 text-center">
            Enter the email on your account and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {message ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-3">
            {message}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm text-[#1F2937] mb-1">Email</label>
              <input
                type="email"
                className="
                  w-full
                  rounded-lg
                  bg-white
                  border border-[#E5E7EB]
                  px-4 py-3
                  text-sm
                  text-[#1F2937]
                  placeholder:text-gray-400
                  focus:outline-none
                  focus:ring-2
                  focus:ring-[#1E3A8A]
                "
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="
                w-full
                rounded-xl
                bg-[#1E3A8A]
                hover:bg-[#182E6E]
                text-white
                text-sm
                font-semibold
                py-3
                mt-2
                transition
                flex items-center justify-center gap-2
                disabled:opacity-60
                disabled:cursor-not-allowed
              "
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="text-xs text-center text-gray-600">
          <Link href="/signin" className="text-[#1E3A8A] hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
