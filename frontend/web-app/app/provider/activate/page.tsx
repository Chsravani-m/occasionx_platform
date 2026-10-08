"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { activateProviderAccount } from "@/services/providerApi";

function ActivateProviderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Activating your account...");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    const activate = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("This activation link is missing a token.");
        return;
      }

      try {
        const res = await activateProviderAccount(token);

        setBusinessName(res.business_name || "");
        setStatus("success");
        setMessage(
          "Your provider account is now active. You can log in."
        );
      } catch (err: any) {
        setStatus("error");
        setMessage(
          err?.response?.data?.detail ||
            "This activation link is invalid or has already been used."
        );
      }
    };

    activate();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
        <img
          src="/AppLogo%201.png"
          alt="OccasionX"
          className="h-16 mx-auto mb-6"
        />

        {status === "loading" && (
          <div
            className="
              w-12
              h-12
              border-4
              border-[#1E3A8A]
              border-t-transparent
              rounded-full
              animate-spin
              mx-auto
              mb-4
            "
          />
        )}

        {status === "success" && (
          <div className="text-5xl mb-4">✅</div>
        )}

        {status === "error" && (
          <div className="text-5xl mb-4">⚠️</div>
        )}

        <h1 className="text-2xl font-bold text-[#1F2937]">
          {status === "success"
            ? `Welcome${businessName ? `, ${businessName}` : ""}!`
            : status === "error"
            ? "Activation failed"
            : "Activating..."}
        </h1>

        <p className="text-gray-500 mt-3">
          {message}
        </p>

        {status === "success" && (
          <button
            onClick={() => router.push("/provider/login")}
            className="
              mt-6
              w-full
              bg-[#1E3A8A]
              hover:bg-[#182E6E]
              text-white
              py-3
              rounded-xl
              font-semibold
              transition
            "
          >
            Go to Provider Login
          </button>
        )}

        {status === "error" && (
          <button
            onClick={() => router.push("/provider/login")}
            className="
              mt-6
              w-full
              border
              border-[#1E3A8A]
              text-[#1E3A8A]
              hover:bg-[#F8F6F2]
              py-3
              rounded-xl
              font-semibold
              transition
            "
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default function ActivateProviderPage() {
  return (
    <Suspense fallback={null}>
      <ActivateProviderContent />
    </Suspense>
  );
}
