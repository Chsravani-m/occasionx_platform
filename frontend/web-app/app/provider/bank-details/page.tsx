"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  getBankDetails,
  updateBankDetails,
  getRazorpayAccountStatus,
  setupRazorpayAccount,
} from "@/services/providerBankApi";

const BUSINESS_TYPE_OPTIONS = [
  { value: "individual", label: "Individual" },
  { value: "proprietorship", label: "Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "huf", label: "HUF" },
  { value: "private_limited", label: "Private Limited" },
  { value: "public_limited", label: "Public Limited" },
  { value: "llp", label: "LLP" },
  { value: "ngo", label: "NGO" },
  { value: "trust", label: "Trust" },
  { value: "society", label: "Society" },
  { value: "not_yet_registered", label: "Not Yet Registered" },
];

export default function ProviderBankDetailsPage() {
  const router = useRouter();

  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payoutAutomated, setPayoutAutomated] = useState(false);

  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");

  // Razorpay Route linked-account setup - separate from the plain
  // bank-details form above, since this actually calls Razorpay's
  // live API to create/activate a linked account (see
  // services/provider-service/app/crud/razorpay_account.py).
  const [panNumber, setPanNumber] = useState("");
  const [businessType, setBusinessType] = useState("individual");
  const [businessCategory, setBusinessCategory] = useState("services");
  const [businessSubcategory, setBusinessSubcategory] = useState(
    "event_management"
  );
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [linkedAccountId, setLinkedAccountId] = useState<string | null>(
    null
  );
  const [requirements, setRequirements] = useState<string[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("provider_id");

    if (!id) {
      router.push("/provider/login");
      return;
    }

    setProviderId(id);

    Promise.all([
      getBankDetails(id),
      getRazorpayAccountStatus(id).catch(() => null),
    ])
      .then(([bank, razorpayStatus]) => {
        setAccountHolderName(bank.bank_account_holder_name || "");
        setAccountNumber(bank.bank_account_number || "");
        setIfscCode(bank.bank_ifsc_code || "");
        setBankName(bank.bank_name || "");
        setPayoutAutomated(!!bank.payout_automated);

        if (razorpayStatus) {
          setAccountStatus(razorpayStatus.razorpay_account_status || null);
          setLinkedAccountId(
            razorpayStatus.razorpay_linked_account_id || null
          );
          setRequirements(razorpayStatus.razorpay_account_requirements || []);
          setSetupError(razorpayStatus.razorpay_account_error || null);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Couldn't load your bank details. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!providerId) return;

    if (
      !accountHolderName.trim() ||
      !accountNumber.trim() ||
      !ifscCode.trim() ||
      !bankName.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await updateBankDetails(providerId, {
        bank_account_holder_name: accountHolderName.trim(),
        bank_account_number: accountNumber.trim(),
        bank_ifsc_code: ifscCode.trim().toUpperCase(),
        bank_name: bankName.trim(),
      });

      setSuccess("Bank details saved.");
    } catch (err) {
      console.error(err);
      setError("Couldn't save your bank details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetupPayouts = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!providerId) return;

    if (
      !panNumber.trim() ||
      !businessType ||
      !businessCategory.trim() ||
      !businessSubcategory.trim() ||
      !addressLine1.trim() ||
      !city.trim() ||
      !stateName.trim() ||
      !postalCode.trim()
    ) {
      setSetupError("Please fill in all the fields below.");
      return;
    }

    if (
      !accountHolderName.trim() ||
      !accountNumber.trim() ||
      !ifscCode.trim()
    ) {
      setSetupError(
        "Please save your bank details above first - automatic " +
          "payouts need an account to pay out to."
      );
      return;
    }

    setSetupError(null);
    setSetupSuccess(null);
    setSettingUp(true);

    try {
      const result = await setupRazorpayAccount(providerId, {
        pan_number: panNumber.trim().toUpperCase(),
        business_type: businessType,
        business_category: businessCategory.trim(),
        business_subcategory: businessSubcategory.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: stateName.trim(),
        postal_code: postalCode.trim(),
      });

      setAccountStatus(result.razorpay_account_status || null);
      setLinkedAccountId(result.razorpay_linked_account_id || null);
      setRequirements(result.razorpay_account_requirements || []);
      setPayoutAutomated(!!result.razorpay_linked_account_id);
      setSetupSuccess(
        "Submitted to Razorpay. See the status below for what's next."
      );
    } catch (err: unknown) {
      console.error(err);
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response
          ?.data?.detail ||
        "Couldn't set up automatic payouts. Please try again.";
      setSetupError(message);
    } finally {
      setSettingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading bank details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Link
          href="/provider/dashboard"
          className="text-sm font-medium text-[#182E6E]"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-4 bg-white border border-[#E5E7EB] rounded-3xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-[#1F2937]">
            Bank Details
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            OccasionX takes no commission - the full amount you charge
            for a booking is meant to reach the account below. (Free-plan
            customers separately pay a small booking fee to confirm
            their booking; that fee goes to OccasionX and isn&apos;t
            taken out of your payout.)
          </p>

          {payoutAutomated && accountStatus === "activated" ? (
            <div className="mt-4 rounded-lg px-3 py-2 text-xs bg-green-50 text-green-700 border border-green-200">
              Automatic payouts are set up - the amount your customers
              pay for a booking is split straight to this account.
            </div>
          ) : (
            <div className="mt-4 rounded-lg px-3 py-2 text-xs bg-amber-50 text-amber-700 border border-amber-200">
              Automatic payouts aren&apos;t fully set up yet - until
              they are, booking payments are collected by OccasionX and
              need to be settled to this account manually. Complete the
              &quot;Automatic Payouts&quot; section below to fix that.
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-3">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded-lg px-3 py-3">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#1F2937]">
                Account Holder Name
              </label>
              <input
                type="text"
                className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                placeholder="As it appears on your bank account"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1F2937]">
                Account Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                placeholder="Bank account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1F2937]">
                IFSC Code
              </label>
              <input
                type="text"
                className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70 uppercase"
                placeholder="e.g. HDFC0001234"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1F2937]">
                Bank Name
              </label>
              <input
                type="text"
                className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                placeholder="e.g. State Bank of India"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-[#1E3A8A] hover:bg-[#182E6E] text-white text-sm font-semibold py-2.5 mt-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Bank Details"}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-white border border-[#E5E7EB] rounded-3xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-[#1F2937]">
            Automatic Payouts
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            This sets up a Razorpay linked account in your business's
            name, so booking payments split straight to the bank
            account above instead of being settled manually. This is a
            one-time business/KYC form - Razorpay may still ask for
            identity or address documents afterwards, which
            you&apos;ll need to complete directly with them.
          </p>

          {linkedAccountId && (
            <div className="mt-4 rounded-lg px-3 py-2 text-xs bg-slate-50 text-slate-700 border border-slate-200 space-y-1">
              <div>
                <span className="font-medium">Status: </span>
                {accountStatus || "created"}
              </div>
              {requirements.length > 0 && (
                <div>
                  <span className="font-medium">
                    Razorpay still needs:{" "}
                  </span>
                  {requirements.join(", ")}
                </div>
              )}
            </div>
          )}

          {setupError && (
            <div className="mt-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-3">
              {setupError}
            </div>
          )}

          {setupSuccess && (
            <div className="mt-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded-lg px-3 py-3">
              {setupSuccess}
            </div>
          )}

          <form onSubmit={handleSetupPayouts} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#1F2937]">
                PAN Number
              </label>
              <input
                type="text"
                className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70 uppercase"
                placeholder="e.g. ABCDE1234F"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1F2937]">
                Business Type
              </label>
              <select
                className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                {BUSINESS_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#1F2937]">
                  Business Category
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#1F2937]">
                  Business Subcategory
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                  value={businessSubcategory}
                  onChange={(e) => setBusinessSubcategory(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#1F2937]">
                Business Address
              </label>
              <input
                type="text"
                className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                placeholder="Address line 1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
              <input
                type="text"
                className="mt-2 w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                placeholder="Address line 2 (optional)"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[#1F2937]">
                  City
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#1F2937]">
                  State
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#1F2937]">
                  PIN Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={settingUp}
              className="w-full rounded-full bg-[#1E3A8A] hover:bg-[#182E6E] text-white text-sm font-semibold py-2.5 mt-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {settingUp
                ? "Setting Up..."
                : linkedAccountId
                ? "Update Automatic Payout Details"
                : "Set Up Automatic Payouts"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
