"use client";
import { API_GATEWAY_URL } from "@/lib/apiClient";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { login } from "@/services/authApi";

export default function ProviderLoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    try {
      setLoading(true);

      const response =
        await login(
          identifier,
          password
        );

      console.log(
        "PROVIDER LOGIN",
        response
      );

      if (
        response.user.role !==
        "PROVIDER"
      ) {
        setError(
          "This account is not registered as a provider."
        );
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify(
          response.user
        )
      );

      localStorage.setItem(
        "accessToken",
        response.accessToken
      );

      localStorage.setItem(
        "refreshToken",
        response.refreshToken
      );

      if (
        response.provider_id
      ) {
        localStorage.setItem(
          "provider_id",
          response.provider_id
        );
      }

      const providerId =
        response.provider_id;

const dashboardRes =
  await fetch(
    `${API_GATEWAY_URL}/providers/dashboard/${providerId}`
  );

const dashboard =
  await dashboardRes.json();

if (!dashboard.documents_uploaded) {
  router.push("/provider/setup?tab=documents");
}
else if (dashboard.portfolio_count === 0) {
  router.push("/provider/setup?tab=portfolio");
}
else if (dashboard.services_count === 0) {
  router.push("/provider/setup?tab=services");
}
else if (!dashboard.pricing_completed) {
  router.push("/provider/setup?tab=services");
}
else if (!dashboard.registration_fee_paid) {
  router.push("/provider/setup?tab=subscription");
}
else {
  router.push("/provider/dashboard");
}

    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.detail ||
          "Invalid email/mobile or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center px-4">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">

        <div className="text-center mb-8">

          <img
            src="/AppLogo%201.png"
            alt="OccasionX"
            className="h-16 mx-auto mb-4"
          />

          <h1 className="text-3xl font-bold text-[#1F2937]">
            Provider Login
          </h1>

          <p className="text-gray-500 mt-2">
            Access your provider dashboard
          </p>

        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          <div>

            <label className="block text-sm font-medium mb-2">
              Email or Mobile
            </label>

            <input
              type="text"
              value={identifier}
              onChange={(e) =>
                setIdentifier(
                  e.target.value
                )
              }
              className="w-full border rounded-xl p-4"
              placeholder="Enter email or mobile"
            />

          </div>

          <div>

            <label className="block text-sm font-medium mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              className="w-full border rounded-xl p-4"
              placeholder="Enter password"
            />

          </div>

          <button
            type="submit"
            disabled={loading}
            className="
              w-full
              bg-[#1E3A8A]
              hover:bg-[#182E6E]
              text-white
              py-4
              rounded-xl
              font-semibold
            "
          >
            {loading
              ? "Signing In..."
              : "Sign In as Provider"}
          </button>

        </form>

        <div className="mt-6 text-center text-sm text-gray-500">

          Not a provider?

          <button
            onClick={() =>
              router.push("/signin")
            }
            className="ml-2 text-[#1E3A8A] font-medium"
          >
            User Login
          </button>

        </div>

        <div className="mt-2 text-center text-sm text-gray-500">

          New provider?

          <button
            onClick={() =>
              router.push(
                "/provider/register"
              )
            }
            className="ml-2 text-[#1E3A8A] font-medium"
          >
            Register Here
          </button>

        </div>

      </div>

    </div>
  );
}
