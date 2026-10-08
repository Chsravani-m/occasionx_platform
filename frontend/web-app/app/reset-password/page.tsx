"use client";
import { Suspense } from "react";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/services/authApi";

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setMessage(null);

    if (!token) {
      setError("This reset link is invalid or missing a token.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword(token, password);
      setMessage(
        res.message || "Your password has been reset successfully."
      );

      setTimeout(() => {
        router.push("/signin");
      }, 2000);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        "This reset link is invalid or has expired. Please request a new one."
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
          <h2 className="text-2xl font-bold text-[#1F2937]">Reset your password</h2>
          <p className="text-sm text-gray-500 text-center">
            Choose a new password for your account.
          </p>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {message ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-3">
            {message} Redirecting you to sign in...
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm text-[#1F2937] mb-1">New Password</label>
              <input
                type="password"
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
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm text-[#1F2937] mb-1">Confirm Password</label>
              <input
                type="password"
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
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
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
              {loading ? "Resetting..." : "Reset Password"}
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

// useSearchParams() needs a Suspense boundary for `next build` to
// prerender this page.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
