"use client";
import { API_GATEWAY_URL } from "@/lib/apiClient";

import { useEffect, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";

import {
  uploadProviderDocument, getProviderDocuments
} from "@/services/providerDocumentApi";

import { getProviderDashboard } from "@/services/providerApi";

interface ProviderDocument {
  id: string;
  provider_id: string;
  document_type: string;
  document_url: string;
}
const documentTypes = [
  "GST_CERTIFICATE",
  "PAN_CARD",
  "AADHAAR",
  "BUSINESS_LICENSE",
  "CERTIFICATION"
];

export default function ProviderDocumentsPage() {
  const toast = useToast();
  const confirmDialog = useConfirm();
    const [loading, setLoading] =
        useState(false);

    const [selectedType, setSelectedType] =
        useState("GST_CERTIFICATE");

    const [file, setFile] =
        useState<File | null>(null);

    const [documents, setDocuments] =
        useState<ProviderDocument[]>([]);

    // Was previously hardcoded to a literal "PENDING" that never
    // updated - the badge would keep showing PENDING even after the
    // provider activated their account (which sets
    // verification_status="VERIFIED" - see activate_provider_account
    // in provider-service/app/crud/provider.py). Now fetched for
    // real below.
    const [verificationStatus, setVerificationStatus] =
        useState("PENDING");

    const handleUpload = async () => {
        if (!file) {
            toast.error("Select file");
        return;
        }

    const providerId =
      localStorage.getItem(
        "provider_id"
      );

    if (!providerId) {
      toast.error("Provider not found");
      return;
    }

    try {
      setLoading(true);

      await uploadProviderDocument(
        providerId,
        selectedType,
        file
      );
      await loadDocuments();

      toast.success(
        "Document uploaded successfully"
      );
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setLoading(false);
    }
  };

const loadDocuments = async () => {
  const providerId =
    localStorage.getItem("provider_id");

  if (!providerId) return;

  const docs =
    await getProviderDocuments(
      providerId
    );

  setDocuments(docs);
};

useEffect(() => {
  loadDocuments();

  const providerId = localStorage.getItem("provider_id");

  if (providerId) {
    getProviderDashboard(providerId)
      .then((data) => setVerificationStatus(data.verification_status))
      .catch((err) => console.error(err));
  }
}, []);

  return (
  <div className="min-h-screen bg-[#F8F6F2] p-8">

    <div className="max-w-5xl mx-auto">

      {/* STATUS CARD */}

      <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#1E3A8A] to-[#18285A] p-8 text-white">

        <h1 className="text-3xl font-bold">
          Provider Verification
        </h1>

        <p className="mt-2 text-white/80">
          Upload your documents to become a verified OccasionX provider.
        </p>

        <div className="mt-5 inline-flex rounded-full bg-yellow-400/20 px-4 py-2">
          Status: {verificationStatus}
        </div>

      </div>

      {/* UPLOAD CARD */}

      <div className="bg-white rounded-3xl shadow-lg p-8">

        <h2 className="text-xl font-semibold mb-6">
          Upload Document
        </h2>

        <div className="space-y-5">

          <select
            value={selectedType}
            onChange={(e) =>
              setSelectedType(
                e.target.value
              )
            }
            className="w-full border rounded-xl p-4"
          >
            {documentTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>

          <input
            type="file"
            onChange={(e) =>
              setFile(
                e.target.files?.[0] || null
              )
            }
            className="w-full border border-dashed rounded-xl p-6"
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            className="
              w-full
              bg-[#1E3A8A]
              text-white
              py-4
              rounded-xl
            "
          >
            {loading
              ? "Uploading..."
              : "Upload Document"}
          </button>

        </div>

      </div>

      {/* DOCUMENT LIST */}

      <div className="mt-8 bg-white rounded-3xl shadow-lg p-8">

        <h2 className="text-xl font-semibold mb-6">
          Uploaded Documents
        </h2>

        {documents.length === 0 ? (

          <div className="text-center py-10 text-gray-500">
            No documents uploaded
          </div>

        ) : (

          <div className="space-y-4">

            {documents.map((doc) => (

              <div
                key={doc.id}
                className="
                  flex
                  justify-between
                  items-center
                  border
                  rounded-xl
                  p-4
                "
              >

                <div>
                  <p className="font-medium">
                    {doc.document_type}
                  </p>
                </div>

                <a
                  href={`${API_GATEWAY_URL}${doc.document_url}`}
                  target="_blank"
                  className="
                    bg-[#F8F6F2]
                    px-4
                    py-2
                    rounded-lg
                  "
                >
                  View
                </a>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>

  </div>
);
}