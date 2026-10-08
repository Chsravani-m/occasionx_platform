"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../services/authApi";;
import { getDashboardRoute } from "@/utils/dashboardRoute";

  const SignInPage: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {

  e.preventDefault();

  setError(null);

  if (!identifier || !password) {

    setError("Please enter your email/mobile and password.");
    return;
  }

  setLoading(true);

  try {

    const response = await login(
      identifier,
      password
    );

  console.log("LOGIN RESPONSE:", response);

  /* SAVE USER */
  localStorage.setItem(
    "user",
    JSON.stringify(response.user)
  );

  localStorage.setItem(
  "accessToken",
  response.accessToken
);

localStorage.setItem(
  "refreshToken",
  response.refreshToken
);

  const role = response.user.role;

console.log(
  "ROLE =",
  role
);

router.push(
  getDashboardRoute(role)
);

  }catch (err: any) {

  console.error(err);

  // err.message on an axios error is a generic "Request failed with
  // status code 400" - the actual reason (e.g. "Please verify your
  // email or mobile", "Invalid credentials") is in the response body.
  // Mirrors the same fix already applied to /provider/login.
  setError(
    err?.response?.data?.detail || "Login failed"
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
          <h2 className="text-2xl font-bold text-[#1F2937]">Sign in to OccasionX</h2>
          <p className="text-sm text-gray-500">Manage your bookings, wishlist and events.</p>
        </div>
        {error && (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-[#1F2937] mb-1">Email or Mobile</label>
            <input
              type="text"
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
              placeholder="Enter your email or mobile"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-[#1F2937] mb-1">Password</label>
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-[#1E3A8A]"
              />
              Remember me
            </label>
            <button
              type="button"
              className="text-[#1E3A8A] hover:underline"
              onClick={() => router.push("/forgot-password")}
            >
              Forgot password?
            </button>
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="text-xs text-center text-gray-600 space-y-2">
          <div>
            Don`t have an account?{' '}
            <button className="text-[#1E3A8A] hover:underline" onClick={() => router.push("/register")}>Register</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
