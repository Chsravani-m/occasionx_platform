"use client";
import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios, { AxiosError } from "axios";

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("Verifying email...");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get("token");

        if (!token) {
          setMessage("Invalid verification link");
          return;
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_GATEWAY}/auth/verify-email`,
          {
            token,
          }
        );

        setMessage(response.data.message);
      } catch (error: unknown) {

    if (axios.isAxiosError(error)) {
        setMessage(
        error.response?.data?.detail ??
        "Verification failed"
        );
    } else {
        setMessage("Verification failed");
    }
    }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white shadow rounded-xl p-8">
        <h1 className="text-xl font-semibold">
          {message}
        </h1>
      </div>
    </div>
  );
}

// useSearchParams() needs a Suspense boundary for `next build` to
// prerender this page.
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
