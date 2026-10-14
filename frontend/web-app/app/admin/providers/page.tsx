"use client";
import { openProtectedFile } from "@/lib/apiClient";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getProviders,
  getProviderDocuments,
} from "@/services/adminProviderApi";

interface Provider {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  verification_status: string;
  registration_fee_paid: boolean;
  account_activated: boolean;
}

interface Document {
  id: string;
  provider_id: string;
  document_type: string;
  document_url: string;
  uploaded_at: string;
}

function statusColor(status: string) {
  switch (status) {
    case "VERIFIED":
      return "bg-[#E0E4EF] text-[#182E6E]";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function activationBadge(activated: boolean) {
  return activated
    ? "bg-[#E0E4EF] text-[#182E6E]"
    : "bg-amber-100 text-amber-700";
}

export default function AdminProvidersPage() {
  const [providers, setProviders] =
    useState<Provider[]>([]);

  const [documents, setDocuments] =
    useState<Document[]>([]);

  const [
    selectedProviderName,
    setSelectedProviderName,
  ] = useState("");

  const [search, setSearch] = useState("");

  const [showDocuments, setShowDocuments] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    async function load() {
      try {
        const data = await getProviders();
        setProviders(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const handleViewDocuments = async (
    providerId: string,
    providerName: string
  ) => {
    try {
      const data = await getProviderDocuments(providerId);

      setDocuments(data);
      setSelectedProviderName(providerName);
      setShowDocuments(true);
    } catch (error) {
      console.error(error);
      alert("Failed to load documents");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        Loading...
      </div>
    );
  }

  const filteredProviders = providers.filter(
    (provider) =>
      provider.business_name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      provider.owner_name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      provider.email
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(
    filteredProviders.length / pageSize
  );

  const currentProviders = filteredProviders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const activatedCount = providers.filter(
    (p) => p.account_activated
  ).length;

  const pendingCount = providers.length - activatedCount;

  return (
    <div className="max-w-7xl mx-auto p-8">

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#1F2937]">
            Providers
          </h1>

          <p className="text-gray-500 mt-2">
            Providers activate their own accounts via the email link
            sent after registration payment - no manual approval
            needed here.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="bg-[#1E3A8A] hover:bg-[#182E6E] text-white px-5 py-3 rounded-xl font-semibold transition whitespace-nowrap"
        >
          Go to Dashboard
        </Link>
      </div>

      <div className="relative mt-8">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search providers..."
          className="
            w-full
            bg-white
            border
            rounded-2xl
            pl-12
            p-4
          "
        />

        <span
          className="
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            text-gray-400
          "
        >
          🔍
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-8">

        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <p className="text-gray-500">
            Total Providers
          </p>

          <h2 className="text-4xl font-bold text-[#1F2937] mt-2">
            {providers.length}
          </h2>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <p className="text-gray-500">
            Activated
          </p>

          <h2 className="text-4xl font-bold text-[#1E3A8A] mt-2">
            {activatedCount}
          </h2>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <p className="text-gray-500">
            Awaiting Activation
          </p>

          <h2 className="text-4xl font-bold text-amber-600 mt-2">
            {pendingCount}
          </h2>
        </div>

      </div>

      {currentProviders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-6 mt-8">
          No providers found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border bg-white shadow-sm mt-8">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8F6F2] text-gray-600">
              <tr>
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium">Owner</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Fee Paid</th>
                <th className="px-6 py-3 font-medium">Activation</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Documents</th>
              </tr>
            </thead>

            <tbody>
              {currentProviders.map((provider) => (
                <tr key={provider.id} className="border-t">
                  <td className="px-6 py-4 font-medium text-[#1F2937]">
                    {provider.business_name}
                  </td>

                  <td className="px-6 py-4">
                    {provider.owner_name}
                  </td>

                  <td className="px-6 py-4">
                    {provider.email}
                  </td>

                  <td className="px-6 py-4">
                    {provider.registration_fee_paid ? "Yes" : "No"}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${activationBadge(
                        provider.account_activated
                      )}`}
                    >
                      {provider.account_activated
                        ? "Activated"
                        : "Pending"}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(
                        provider.verification_status
                      )}`}
                    >
                      {provider.verification_status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() =>
                        handleViewDocuments(
                          provider.id,
                          provider.business_name
                        )
                      }
                      className="text-[#1E3A8A] font-medium hover:underline"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-4 mt-10">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border rounded-xl disabled:opacity-50"
          >
            Previous
          </button>

          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border rounded-xl disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {showDocuments && (
        <div
          className="
            fixed
            inset-0
            bg-black/30
            z-50
            flex
            justify-end
          "
        >
          <div
            className="
              w-[500px]
              bg-white
              h-full
              overflow-y-auto
              shadow-2xl
              p-8
            "
          >
            <div className="flex justify-between">
              <h2 className="text-2xl font-bold">
                Documents
              </h2>

              <button onClick={() => setShowDocuments(false)}>
                ✕
              </button>
            </div>

            <p className="text-gray-500 mt-2">
              {selectedProviderName}
            </p>

            <div className="mt-8 space-y-4">
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No documents uploaded yet.
                </p>
              ) : (
                documents.map((document) => (
                  <div
                    key={document.id}
                    className="border rounded-2xl p-5"
                  >
                    <h3 className="font-semibold">
                      {document.document_type}
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        openProtectedFile(document.document_url).catch(() =>
                          alert("Couldn't open this document.")
                        )
                      }
                      className="mt-3 inline-block text-[#1E3A8A] font-medium"
                    >
                      Open Document →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
