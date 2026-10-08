"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/context/NotificationContext";

import {
  registerProvider,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  uploadProviderLogo,
  uploadProviderCoverImage,
  uploadProviderPromotionalVideo,
  updateProviderLocation,
  assignProviderCategories,
  updateProviderServicesTab,
  updateProviderPricingTab,
  updateProviderAvailabilityTab,
  updateProviderKyc,
  type ProviderBranch,
  type BusinessHours,
} from "@/services/providerApi";

import {
  getStates,
  getDistricts,
  getLocations,
  type StateDto,
  type DistrictDto,
  type LocationDto,
} from "@/services/locationApi";

import {
  getCategories,
  getSubcategories,
  type Category,
  type Subcategory,
} from "@/services/catalogApi";

import { updateBankDetails } from "@/services/providerBankApi";
import { uploadProviderDocument } from "@/services/providerDocumentApi";
import {
  getProviderServices,
  createProviderService,
} from "@/services/providerServiceApi";

import PortfolioSection from "@/components/provider-onboarding/PortfolioSection";
import DocumentsSection from "@/components/provider-onboarding/DocumentsSection";
import SubscriptionSection from "@/components/provider-onboarding/SubscriptionSection";
import TermsModal from "@/components/legal/TermsModal";
import { PROVIDER_TERMS_SECTIONS } from "@/components/legal/providerTermsContent";

import {
  hasAcceptedProviderTerms,
  acceptProviderTerms,
  clearProviderTermsAcceptance,
} from "@/utils/terms";

const DRAFT_KEY = "ox_provider_wizard_draft";

const TAB_LABELS = [
  "Business Information",
  "Contact Details",
  "Business Location",
  "Services",
  "Pricing",
  "Availability",
  "KYC",
];

const WEEKDAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_HOURS: BusinessHours = WEEKDAYS.reduce((acc, d) => {
  acc[d.key] = { open: "09:00", close: "18:00" };
  return acc;
}, {} as BusinessHours);

const PAYMENT_MODE_OPTIONS = [
  "UPI",
  "Card",
  "Cash",
  "Bank Transfer",
  "Net Banking",
];

const ENTITY_TYPE_OPTIONS = [
  "Individual",
  "Partnership",
  "LLP",
  "Pvt Ltd",
  "NGO",
  "Others",
];

const fieldClass =
  "w-full rounded-xl border border-[#E5E7EB] bg-[#FFFCF8] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]";

const labelClass = "font-semibold text-sm mb-2 block";

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-10">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-[#1F2937]">{title}</h2>
        {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
      </div>

      {children}
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel = "Continue",
  loading = false,
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  loading?: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex justify-between mt-10">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-3 rounded-xl border border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#F8F6F2] transition"
        >
          ← Back
        </button>
      ) : (
        <span />
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={loading || nextDisabled}
        className="px-10 py-3 rounded-xl bg-[#1E3A8A] text-white hover:bg-[#182E6E] transition disabled:opacity-50"
      >
        {loading ? "Saving..." : nextLabel}
      </button>
    </div>
  );
}

function TabProgress({ current }: { current: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {TAB_LABELS.map((label, i) => {
          const step = i + 1;
          const active = step === current;
          const done = step < current;

          return (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                  active
                    ? "bg-[#1E3A8A] text-white"
                    : done
                    ? "bg-[#C89B3C] text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? "✓" : step}
              </div>
              <span
                className={`mt-2 text-[11px] text-center hidden md:block ${
                  active ? "text-[#1E3A8A] font-semibold" : "text-gray-500"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200">
        <div
          className="h-1.5 rounded-full bg-[#1E3A8A] transition-all"
          style={{ width: `${(current / TAB_LABELS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Tab 1: Business Information
// ---------------------------------------------------------------------

interface BusinessInfoValues {
  business_name: string;
  legal_entity_name: string;
  gst_number: string;
  pan_number: string;
  year_established: string;
  business_registration_number: string;
  entity_type: string;
  description: string;
}

function Tab1BusinessInfo({
  values,
  onChange,
  onNext,
}: {
  values: BusinessInfoValues;
  onChange: (patch: Partial<BusinessInfoValues>) => void;
  onNext: () => void;
}) {
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!values.business_name.trim()) {
      setError("Business name is required.");
      return;
    }
    if (!values.entity_type) {
      setError("Please select a business type.");
      return;
    }
    setError("");
    onNext();
  };

  return (
    <CardShell
      title="Business Information"
      subtitle="Tell customers who you are - your logo, cover photo, gallery and promotional video are added right after you verify your mobile number in the next step."
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Business Name *</label>
          <input
            className={fieldClass}
            value={values.business_name}
            onChange={(e) => onChange({ business_name: e.target.value })}
            placeholder="e.g. Sunrise Events & Catering"
          />
        </div>

        <div>
          <label className={labelClass}>Legal Entity Name</label>
          <input
            className={fieldClass}
            value={values.legal_entity_name}
            onChange={(e) => onChange({ legal_entity_name: e.target.value })}
            placeholder="As registered with the government"
          />
        </div>

        <div>
          <label className={labelClass}>GST Number (Optional)</label>
          <input
            className={fieldClass}
            value={values.gst_number}
            onChange={(e) => onChange({ gst_number: e.target.value })}
            placeholder="22AAAAA0000A1Z5"
          />
        </div>

        <div>
          <label className={labelClass}>PAN Number</label>
          <input
            className={fieldClass}
            value={values.pan_number}
            onChange={(e) =>
              onChange({ pan_number: e.target.value.toUpperCase() })
            }
            placeholder="ABCDE1234F"
          />
        </div>

        <div>
          <label className={labelClass}>Year Established</label>
          <input
            type="number"
            className={fieldClass}
            value={values.year_established}
            onChange={(e) =>
              onChange({ year_established: e.target.value })
            }
            placeholder="2018"
          />
        </div>

        <div>
          <label className={labelClass}>Business Registration Number</label>
          <input
            className={fieldClass}
            value={values.business_registration_number}
            onChange={(e) =>
              onChange({ business_registration_number: e.target.value })
            }
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Business Type *</label>
          <div className="flex flex-wrap gap-2">
            {ENTITY_TYPE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onChange({ entity_type: option })}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                  values.entity_type === option
                    ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                    : "bg-white text-[#1F2937] border-[#E5E7EB] hover:border-[#1E3A8A]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <label className={labelClass}>Business Description</label>
        <textarea
          rows={5}
          className={fieldClass}
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe your services, specialties and what makes you stand out..."
        />
      </div>

      {error && (
        <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <StepNav onNext={handleNext} />
    </CardShell>
  );
}

// ---------------------------------------------------------------------
// Tab 2: Contact Details (+ account creation + OTP + password + media)
// ---------------------------------------------------------------------

interface ContactValues {
  contact_person: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  website_url: string;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  password: string;
  confirm_password: string;
}

function Tab2ContactDetails({
  values,
  onChange,
  businessInfo,
  onAccountCreated,
  onNext,
  onBack,
}: {
  values: ContactValues;
  onChange: (patch: Partial<ContactValues>) => void;
  businessInfo: BusinessInfoValues;
  onAccountCreated: (providerId: string, userId: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toast = useToast();
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  // Only ever set when the backend is running in WHATSAPP_TEST_MODE
  // (nothing was actually delivered) - see sendRegistrationOtp in
  // services/providerApi.ts. Shown inline and auto-filled so testing
  // doesn't require checking the auth-service server console.
  const [testOtp, setTestOtp] = useState<string | null>(null);
  // True when this phone number already has an incomplete
  // registration (account created, fee never paid) - the backend
  // picks that account back up instead of blocking with "account
  // already exists". See send_registration_otp/register_provider in
  // services/auth-service/app/services/auth_service.py.
  const [resuming, setResuming] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneToken, setPhoneToken] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  // Not a checkbox - reflects whether the person has opened the Terms
  // & Conditions dialog and clicked "I Agree" at the end of it. The
  // dialog renders in-page (see TermsModal below) rather than in a
  // separate tab, so this just mirrors hasAcceptedProviderTerms()
  // directly - no cross-tab storage-event listening needed.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    setAcceptedTerms(hasAcceptedProviderTerms());
  }, []);

  // Media (Tab 1 fields that need a provider_id, uploaded here once
  // the account exists - see Tab1BusinessInfo's subtitle note).
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const [mediaDone, setMediaDone] = useState({
    logo: false,
    cover: false,
    video: false,
  });

  const handleSendOtp = async () => {
    setError("");
    const digits = values.phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    try {
      setOtpSending(true);
      const res = await sendRegistrationOtp(digits);
      setOtpSent(true);
      setResuming(Boolean(res.resuming));

      if (res.test_otp) {
        setTestOtp(res.test_otp);
        setOtpCode(res.test_otp);
      } else {
        setTestOtp(null);
      }
    } catch (err) {
      console.error(err);
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response
          ?.data?.detail || "Unable to send OTP. Please try again."
      );
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!otpCode.trim()) {
      setError("Enter the OTP sent to your mobile.");
      return;
    }
    try {
      setOtpVerifying(true);
      const digits = values.phone.replace(/\D/g, "");
      const res = await verifyRegistrationOtp(digits, otpCode.trim());
      setPhoneVerified(true);
      setPhoneToken(res.phone_verification_token);
    } catch (err) {
      console.error(err);
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response
          ?.data?.detail || "Invalid OTP. Please try again."
      );
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleCreateAccount = async () => {
    setError("");

    if (!values.contact_person.trim()) {
      setError("Contact person name is required.");
      return;
    }
    if (!phoneVerified) {
      setError("Please verify your mobile number first.");
      return;
    }
    if (!values.email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (values.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (values.password !== values.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setError(
        "Please agree to the Service Provider Terms & Conditions before continuing."
      );
      return;
    }

    try {
      setCreatingAccount(true);

      const response = await registerProvider({
        full_name: values.contact_person,
        owner_name: values.contact_person,
        business_name: businessInfo.business_name,
        email: values.email,
        phone: values.phone.replace(/\D/g, ""),
        password: values.password,
        phone_verification_token: phoneToken,

        gst_number: businessInfo.gst_number || undefined,
        description: businessInfo.description || undefined,
        legal_entity_name: businessInfo.legal_entity_name || undefined,
        pan_number: businessInfo.pan_number || undefined,
        year_established: businessInfo.year_established
          ? Number(businessInfo.year_established)
          : undefined,
        business_registration_number:
          businessInfo.business_registration_number || undefined,
        entity_type: businessInfo.entity_type || undefined,

        contact_person: values.contact_person,
        whatsapp_number: values.whatsapp_number || undefined,
        website_url: values.website_url || undefined,
        facebook_url: values.facebook_url || undefined,
        instagram_url: values.instagram_url || undefined,
        youtube_url: values.youtube_url || undefined,
      });

      localStorage.setItem("provider_id", response.provider_id);
      localStorage.setItem("user_id", response.user_id);

      clearProviderTermsAcceptance();

      setProviderId(response.provider_id);
      setAccountCreated(true);
      onAccountCreated(response.provider_id, response.user_id);
    } catch (err) {
      console.error(err);
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response
          ?.data?.detail || "Registration failed. Please try again."
      );
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleMediaUpload = async (
    kind: "logo" | "cover" | "video",
    file: File | null
  ) => {
    if (!file || !providerId) return;

    try {
      setUploadingMedia(kind);

      if (kind === "logo") await uploadProviderLogo(providerId, file);
      if (kind === "cover") await uploadProviderCoverImage(providerId, file);
      if (kind === "video")
        await uploadProviderPromotionalVideo(providerId, file);

      setMediaDone((prev) => ({ ...prev, [kind]: true }));
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingMedia(null);
    }
  };

  if (accountCreated && providerId) {
    return (
      <CardShell
        title="Business Photos & Video"
        subtitle="Add your logo, cover image, gallery and promotional video (Tab 1) - now that your account exists, these can be uploaded and attached to your profile."
      >
        {resuming && (
          <p className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            Welcome back! We&apos;ve picked up your existing
            registration - please re-check the Location, Services,
            Pricing, Availability and KYC tabs ahead, since anything
            you entered there before wasn&apos;t saved.
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Logo Upload</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setLogoFile(file);
                void handleMediaUpload("logo", file);
              }}
              className={fieldClass}
            />
            {mediaDone.logo && (
              <p className="text-xs text-green-700 mt-1">
                ✓ Logo uploaded
              </p>
            )}
            {uploadingMedia === "logo" && (
              <p className="text-xs text-gray-500 mt-1">Uploading...</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Cover Image</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setCoverFile(file);
                void handleMediaUpload("cover", file);
              }}
              className={fieldClass}
            />
            {mediaDone.cover && (
              <p className="text-xs text-green-700 mt-1">
                ✓ Cover image uploaded
              </p>
            )}
            {uploadingMedia === "cover" && (
              <p className="text-xs text-gray-500 mt-1">Uploading...</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Promotional Video</label>
            <input
              type="file"
              accept=".mp4,.webm,.mov"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setVideoFile(file);
                void handleMediaUpload("video", file);
              }}
              className={fieldClass}
            />
            {mediaDone.video && (
              <p className="text-xs text-green-700 mt-1">
                ✓ Video uploaded
              </p>
            )}
            {uploadingMedia === "video" && (
              <p className="text-xs text-gray-500 mt-1">Uploading...</p>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h3 className="font-semibold text-lg mb-2">
            Gallery (up to 20 images)
          </h3>
          <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <PortfolioSection />
          </div>
        </div>

        <StepNav onNext={onNext} nextLabel="Continue to Business Location" />
      </CardShell>
    );
  }

  return (
    <CardShell
      title="Contact Details"
      subtitle="How customers and OccasionX can reach you."
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Contact Person *</label>
          <input
            className={fieldClass}
            value={values.contact_person}
            onChange={(e) => onChange({ contact_person: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Email Address *</label>
          <input
            type="email"
            className={fieldClass}
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Mobile Number *</label>
          <div className="flex gap-2">
            <input
              className={fieldClass}
              value={values.phone}
              disabled={phoneVerified}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="10-digit mobile number"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpSending || phoneVerified}
              className="px-4 rounded-xl bg-[#F2F3F8] text-[#1E3A8A] font-medium whitespace-nowrap disabled:opacity-50"
            >
              {phoneVerified
                ? "Verified ✓"
                : otpSent
                ? "Resend OTP"
                : otpSending
                ? "Sending..."
                : "Send OTP"}
            </button>
          </div>

          {otpSent && !phoneVerified && (
            <div className="mt-3">
              {resuming && (
                <p className="mb-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  We found an incomplete registration for this number.
                  Verify the OTP to pick up where you left off.
                </p>
              )}

              <div className="flex gap-2">
                <input
                  className={fieldClass}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying}
                  className="px-4 rounded-xl bg-[#1E3A8A] text-white font-medium whitespace-nowrap disabled:opacity-50"
                >
                  {otpVerifying ? "Verifying..." : "Verify"}
                </button>
              </div>

              {testOtp && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Test mode - no WhatsApp message was actually sent. OTP{" "}
                  <span className="font-semibold">{testOtp}</span> has been
                  filled in for you.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>WhatsApp Number</label>
          <input
            className={fieldClass}
            value={values.whatsapp_number}
            onChange={(e) => onChange({ whatsapp_number: e.target.value })}
            placeholder="Leave blank if same as mobile"
          />
        </div>

        <div>
          <label className={labelClass}>Website</label>
          <input
            className={fieldClass}
            value={values.website_url}
            onChange={(e) => onChange({ website_url: e.target.value })}
            placeholder="https://"
          />
        </div>

        <div>
          <label className={labelClass}>Facebook</label>
          <input
            className={fieldClass}
            value={values.facebook_url}
            onChange={(e) => onChange({ facebook_url: e.target.value })}
            placeholder="https://facebook.com/..."
          />
        </div>

        <div>
          <label className={labelClass}>Instagram</label>
          <input
            className={fieldClass}
            value={values.instagram_url}
            onChange={(e) => onChange({ instagram_url: e.target.value })}
            placeholder="https://instagram.com/..."
          />
        </div>

        <div>
          <label className={labelClass}>YouTube</label>
          <input
            className={fieldClass}
            value={values.youtube_url}
            onChange={(e) => onChange({ youtube_url: e.target.value })}
            placeholder="https://youtube.com/..."
          />
        </div>

        <div>
          <label className={labelClass}>Password *</label>
          <input
            type="password"
            className={fieldClass}
            value={values.password}
            onChange={(e) => onChange({ password: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Confirm Password *</label>
          <input
            type="password"
            className={fieldClass}
            value={values.confirm_password}
            onChange={(e) => onChange({ confirm_password: e.target.value })}
          />
        </div>
      </div>

      {acceptedTerms ? (
        <div className="mt-8 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          ✓ You&apos;ve agreed to the Service Provider Terms &amp;
          Conditions.
        </div>
      ) : (
        <div className="mt-8 text-xs text-gray-500 bg-[#F2F3F8] border border-[#B9C1DA] rounded-lg px-3 py-2">
          Please read and agree to our{" "}
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="underline text-[#1E3A8A] font-medium"
          >
            Service Provider Terms &amp; Conditions
          </button>{" "}
          before continuing.
        </div>
      )}

      {error && (
        <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <StepNav
        onBack={onBack}
        onNext={handleCreateAccount}
        nextLabel="Create Account & Continue"
        loading={creatingAccount}
      />

      <TermsModal
        open={showTermsModal}
        title="Service Provider Registration Terms & Conditions"
        sections={PROVIDER_TERMS_SECTIONS}
        onAgree={() => {
          acceptProviderTerms();
          setAcceptedTerms(true);
        }}
        onClose={() => setShowTermsModal(false)}
      />
    </CardShell>
  );
}

// ---------------------------------------------------------------------
// Tab 3: Business Location
// ---------------------------------------------------------------------

interface LocationValues {
  country: string;
  state_id: string;
  district_id: string;
  location_id: string;
  area: string;
  postal_code: string;
  address: string;
  google_map_url: string;
  service_radius_km: string;
}

function Tab3Location({
  values,
  onChange,
  branches,
  onBranchesChange,
  providerId,
  onNext,
  onBack,
}: {
  values: LocationValues;
  onChange: (patch: Partial<LocationValues>) => void;
  branches: ProviderBranch[];
  onBranchesChange: (branches: ProviderBranch[]) => void;
  providerId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [states, setStates] = useState<StateDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [branchDraft, setBranchDraft] = useState<ProviderBranch>({});

  useEffect(() => {
    getStates().then(setStates).catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!values.state_id) {
      setDistricts([]);
      return;
    }
    getDistricts(Number(values.state_id))
      .then(setDistricts)
      .catch((err) => console.error(err));
  }, [values.state_id]);

  useEffect(() => {
    if (!values.district_id) {
      setLocations([]);
      return;
    }
    getLocations(Number(values.district_id))
      .then(setLocations)
      .catch((err) => console.error(err));
  }, [values.district_id]);

  const addBranch = () => {
    if (!branchDraft.address) return;
    onBranchesChange([...branches, branchDraft]);
    setBranchDraft({});
  };

  const removeBranch = (index: number) => {
    onBranchesChange(branches.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    setError("");
    if (!values.state_id || !values.district_id || !values.location_id) {
      setError("Please select your state, district and city.");
      return;
    }

    try {
      setSaving(true);
      await updateProviderLocation(providerId, {
        country: values.country || "India",
        state_id: Number(values.state_id),
        district_id: Number(values.district_id),
        location_id: Number(values.location_id),
        area: values.area || undefined,
        postal_code: values.postal_code || undefined,
        address: values.address || undefined,
        google_map_url: values.google_map_url || undefined,
        service_radius_km: values.service_radius_km
          ? Number(values.service_radius_km)
          : undefined,
        branches,
      });
      onNext();
    } catch (err) {
      console.error(err);
      setError("Unable to save your location. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell
      title="Business Location"
      subtitle="Where you're based and how far you're willing to travel for events."
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Country</label>
          <input
            className={fieldClass}
            value={values.country}
            onChange={(e) => onChange({ country: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Pincode</label>
          <input
            className={fieldClass}
            value={values.postal_code}
            onChange={(e) => onChange({ postal_code: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>State *</label>
          <select
            className={fieldClass}
            value={values.state_id}
            onChange={(e) =>
              onChange({
                state_id: e.target.value,
                district_id: "",
                location_id: "",
              })
            }
          >
            <option value="">Select State</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>District *</label>
          <select
            className={fieldClass}
            value={values.district_id}
            disabled={!values.state_id}
            onChange={(e) =>
              onChange({ district_id: e.target.value, location_id: "" })
            }
          >
            <option value="">Select District</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>City *</label>
          <select
            className={fieldClass}
            value={values.location_id}
            disabled={!values.district_id}
            onChange={(e) => onChange({ location_id: e.target.value })}
          >
            <option value="">Select City</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Area</label>
          <input
            className={fieldClass}
            value={values.area}
            onChange={(e) => onChange({ area: e.target.value })}
            placeholder="Locality / neighbourhood"
          />
        </div>

        <div>
          <label className={labelClass}>Google Map Location</label>
          <input
            className={fieldClass}
            value={values.google_map_url}
            onChange={(e) => onChange({ google_map_url: e.target.value })}
            placeholder="Paste a Google Maps link"
          />
        </div>

        <div>
          <label className={labelClass}>Service Radius (KM)</label>
          <input
            type="number"
            className={fieldClass}
            value={values.service_radius_km}
            onChange={(e) =>
              onChange({ service_radius_km: e.target.value })
            }
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Business Address</label>
          <textarea
            rows={3}
            className={fieldClass}
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-10">
        <h3 className="font-semibold text-lg mb-3">
          Multiple Branches (optional)
        </h3>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            className={fieldClass}
            placeholder="Branch address"
            value={branchDraft.address || ""}
            onChange={(e) =>
              setBranchDraft({ ...branchDraft, address: e.target.value })
            }
          />
          <input
            className={fieldClass}
            placeholder="City"
            value={branchDraft.city || ""}
            onChange={(e) =>
              setBranchDraft({ ...branchDraft, city: e.target.value })
            }
          />
          <button
            type="button"
            onClick={addBranch}
            className="px-6 rounded-xl bg-[#F2F3F8] text-[#1E3A8A] font-medium whitespace-nowrap"
          >
            + Add Branch
          </button>
        </div>

        {branches.length > 0 && (
          <div className="mt-4 space-y-2">
            {branches.map((b, i) => (
              <div
                key={i}
                className="flex justify-between items-center border rounded-xl p-3 bg-[#F8F6F2]"
              >
                <span className="text-sm">
                  {b.address}
                  {b.city ? `, ${b.city}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removeBranch(i)}
                  className="text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <StepNav onBack={onBack} onNext={handleNext} loading={saving} />
    </CardShell>
  );
}

// ---------------------------------------------------------------------
// Tab 4: Services
// ---------------------------------------------------------------------

function Tab4Services({
  providerId,
  onNext,
  onBack,
}: {
  providerId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [primarySubcategories, setPrimarySubcategories] = useState<
    Subcategory[]
  >([]);
  const [primarySubcategory, setPrimarySubcategory] = useState("");

  const [additionalCategory, setAdditionalCategory] = useState("");
  const [additionalSubcategories, setAdditionalSubcategories] = useState<
    Subcategory[]
  >([]);
  const [additionalSubcategory, setAdditionalSubcategory] = useState("");
  const [additionalServices, setAdditionalServices] = useState<
    { category_id: string; subcategory_id: string; label: string }[]
  >([]);

  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [teamSize, setTeamSize] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!primaryCategory) {
      setPrimarySubcategories([]);
      return;
    }
    getSubcategories(primaryCategory)
      .then(setPrimarySubcategories)
      .catch((err) => console.error(err));
  }, [primaryCategory]);

  useEffect(() => {
    if (!additionalCategory) {
      setAdditionalSubcategories([]);
      return;
    }
    getSubcategories(additionalCategory)
      .then(setAdditionalSubcategories)
      .catch((err) => console.error(err));
  }, [additionalCategory]);

  const addAdditionalService = () => {
    if (!additionalCategory) return;
    const category = categories.find((c) => c.id === additionalCategory);
    const subcategory = additionalSubcategories.find(
      (s) => s.id === additionalSubcategory
    );

    setAdditionalServices((prev) => [
      ...prev,
      {
        category_id: additionalCategory,
        subcategory_id: additionalSubcategory,
        label: `${category?.name || ""}${
          subcategory ? " - " + subcategory.name : ""
        }`,
      },
    ]);

    setAdditionalCategory("");
    setAdditionalSubcategory("");
  };

  const removeAdditionalService = (index: number) => {
    setAdditionalServices((prev) => prev.filter((_, i) => i !== index));
  };

  const addLanguage = () => {
    const value = languageInput.trim();
    if (!value || languages.includes(value)) return;
    setLanguages([...languages, value]);
    setLanguageInput("");
  };

  const removeLanguage = (lang: string) => {
    setLanguages(languages.filter((l) => l !== lang));
  };

  const handleNext = async () => {
    setError("");
    if (!primaryCategory) {
      setError("Please select your primary category.");
      return;
    }

    try {
      setSaving(true);

      await assignProviderCategories(providerId, [
        {
          category_id: primaryCategory,
          subcategory_id: primarySubcategory || undefined,
        },
        ...additionalServices.map((s) => ({
          category_id: s.category_id,
          subcategory_id: s.subcategory_id || undefined,
        })),
      ]);

      await updateProviderServicesTab(providerId, {
        languages_spoken: languages,
        years_of_experience: yearsExperience
          ? Number(yearsExperience)
          : undefined,
        team_size: teamSize ? Number(teamSize) : undefined,
      });

      // Picking a category/subcategory above reads as "adding a
      // service" from the provider's point of view, but
      // assignProviderCategories only tags which categories this
      // provider serves - it doesn't create anything bookable. Create
      // an actual named service listing per category/subcategory
      // chosen (pricing for it is added separately on the provider
      // dashboard's Pricing tab), so "My Services" isn't empty right
      // after registration. Skips any category/subcategory
      // combination that already has a listing, so revisiting this
      // tab - e.g. resuming an abandoned registration - doesn't
      // create duplicates.
      const primaryCategoryObj = categories.find(
        (c) => c.id === primaryCategory
      );
      const primarySubcategoryObj = primarySubcategories.find(
        (s) => s.id === primarySubcategory
      );

      const listings = [
        {
          category_id: primaryCategory,
          subcategory_id: primarySubcategory || undefined,
          name:
            (primaryCategoryObj?.name || "Service") +
            (primarySubcategoryObj ? ` - ${primarySubcategoryObj.name}` : ""),
        },
        ...additionalServices.map((s) => ({
          category_id: s.category_id,
          subcategory_id: s.subcategory_id || undefined,
          name: s.label || "Service",
        })),
      ];

      const existingServices: {
        category_id: string;
        subcategory_id?: string;
      }[] = await getProviderServices(providerId).catch(() => []);

      for (const listing of listings) {
        const alreadyExists = existingServices.some(
          (svc) =>
            svc.category_id === listing.category_id &&
            (svc.subcategory_id || undefined) === listing.subcategory_id
        );

        if (alreadyExists) continue;

        await createProviderService(providerId, listing);
      }

      onNext();
    } catch (err) {
      console.error(err);
      setError("Unable to save your services. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell
      title="Services"
      subtitle="What kind of events and services you offer."
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Primary Category *</label>
          <select
            className={fieldClass}
            value={primaryCategory}
            onChange={(e) => {
              setPrimaryCategory(e.target.value);
              setPrimarySubcategory("");
            }}
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Sub Category</label>
          <select
            className={fieldClass}
            value={primarySubcategory}
            disabled={!primaryCategory}
            onChange={(e) => setPrimarySubcategory(e.target.value)}
          >
            <option value="">Select Subcategory</option>
            {primarySubcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Years of Experience</label>
          <input
            type="number"
            className={fieldClass}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Team Size</label>
          <input
            type="number"
            className={fieldClass}
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-10">
        <h3 className="font-semibold text-lg mb-3">Additional Services</h3>

        <div className="flex flex-col md:flex-row gap-3">
          <select
            className={fieldClass}
            value={additionalCategory}
            onChange={(e) => setAdditionalCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className={fieldClass}
            value={additionalSubcategory}
            disabled={!additionalCategory}
            onChange={(e) => setAdditionalSubcategory(e.target.value)}
          >
            <option value="">Select Subcategory</option>
            {additionalSubcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={addAdditionalService}
            className="px-6 rounded-xl bg-[#F2F3F8] text-[#1E3A8A] font-medium whitespace-nowrap"
          >
            + Add Service
          </button>
        </div>

        {additionalServices.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {additionalServices.map((s, i) => (
              <span
                key={i}
                className="flex items-center gap-2 bg-[#F2F3F8] text-[#1E3A8A] px-3 py-1.5 rounded-full text-sm"
              >
                {s.label}
                <button
                  type="button"
                  onClick={() => removeAdditionalService(i)}
                  className="text-[#1E3A8A]/60 hover:text-red-600"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <label className={labelClass}>Languages Spoken</label>
        <div className="flex gap-3">
          <input
            className={fieldClass}
            value={languageInput}
            onChange={(e) => setLanguageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLanguage();
              }
            }}
            placeholder="e.g. English, Hindi, Telugu"
          />
          <button
            type="button"
            onClick={addLanguage}
            className="px-6 rounded-xl bg-[#F2F3F8] text-[#1E3A8A] font-medium whitespace-nowrap"
          >
            + Add
          </button>
        </div>

        {languages.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {languages.map((lang) => (
              <span
                key={lang}
                className="flex items-center gap-2 bg-[#F2F3F8] text-[#1E3A8A] px-3 py-1.5 rounded-full text-sm"
              >
                {lang}
                <button
                  type="button"
                  onClick={() => removeLanguage(lang)}
                  className="text-[#1E3A8A]/60 hover:text-red-600"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <StepNav onBack={onBack} onNext={handleNext} loading={saving} />
    </CardShell>
  );
}

// ---------------------------------------------------------------------
// Tab 5: Pricing
// ---------------------------------------------------------------------

function Tab5Pricing({
  providerId,
  onNext,
  onBack,
}: {
  providerId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [startingPrice, setStartingPrice] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [customQuotation, setCustomQuotation] = useState(false);
  const [advancePercentage, setAdvancePercentage] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [paymentModes, setPaymentModes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleMode = (mode: string) => {
    setPaymentModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const handleNext = async () => {
    setError("");
    try {
      setSaving(true);
      await updateProviderPricingTab(providerId, {
        starting_price: startingPrice ? Number(startingPrice) : undefined,
        price_range_min: priceMin ? Number(priceMin) : undefined,
        price_range_max: priceMax ? Number(priceMax) : undefined,
        custom_quotation_available: customQuotation,
        advance_percentage: advancePercentage
          ? Number(advancePercentage)
          : undefined,
        payment_modes: paymentModes,
        cancellation_policy: cancellationPolicy || undefined,
      });
      onNext();
    } catch (err) {
      console.error(err);
      setError("Unable to save pricing details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell
      title="Pricing"
      subtitle="Help customers understand your rates before they reach out."
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Starting Price (₹)</label>
          <input
            type="number"
            className={fieldClass}
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Advance Percentage (%)</label>
          <input
            type="number"
            className={fieldClass}
            value={advancePercentage}
            onChange={(e) => setAdvancePercentage(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Price Range - Min (₹)</label>
          <input
            type="number"
            className={fieldClass}
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Price Range - Max (₹)</label>
          <input
            type="number"
            className={fieldClass}
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
        </div>
      </div>

      <label className="mt-6 flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={customQuotation}
          onChange={(e) => setCustomQuotation(e.target.checked)}
          className="h-5 w-5 accent-[#1E3A8A]"
        />
        <span className="text-sm font-medium">
          Custom Quotation Available
        </span>
      </label>

      <div className="mt-8">
        <label className={labelClass}>Payment Modes</label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => toggleMode(mode)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                paymentModes.includes(mode)
                  ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                  : "bg-white text-[#1F2937] border-[#E5E7EB] hover:border-[#1E3A8A]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <label className={labelClass}>Cancellation Policy</label>
        <textarea
          rows={4}
          className={fieldClass}
          value={cancellationPolicy}
          onChange={(e) => setCancellationPolicy(e.target.value)}
          placeholder="e.g. Cancellations allowed up to 24 hours before the event; no refund after."
        />
      </div>

      {error && (
        <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <StepNav onBack={onBack} onNext={handleNext} loading={saving} />
    </CardShell>
  );
}

// ---------------------------------------------------------------------
// Tab 6: Availability
// ---------------------------------------------------------------------

function Tab6Availability({
  providerId,
  onNext,
  onBack,
}: {
  providerId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [weeklyOff, setWeeklyOff] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [holidayInput, setHolidayInput] = useState("");
  const [instantBooking, setInstantBooking] = useState(false);
  const [calendarIntegration, setCalendarIntegration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleWeeklyOff = (day: string) => {
    setWeeklyOff((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addHoliday = () => {
    if (!holidayInput) return;
    if (holidays.includes(holidayInput)) return;
    setHolidays([...holidays, holidayInput]);
    setHolidayInput("");
  };

  const removeHoliday = (date: string) => {
    setHolidays(holidays.filter((d) => d !== date));
  };

  const handleNext = async () => {
    setError("");
    try {
      setSaving(true);
      await updateProviderAvailabilityTab(providerId, {
        business_hours: hours,
        weekly_off: weeklyOff,
        holidays,
        instant_booking: instantBooking,
        calendar_integration_enabled: calendarIntegration,
      });
      onNext();
    } catch (err) {
      console.error(err);
      setError("Unable to save availability. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell
      title="Availability"
      subtitle="Let customers know when you're open for bookings."
    >
      <div>
        <label className={labelClass}>Business Hours</label>
        <div className="space-y-3">
          {WEEKDAYS.map((day) => (
            <div
              key={day.key}
              className="flex items-center gap-3 flex-wrap"
            >
              <span className="w-28 text-sm font-medium text-[#1F2937]">
                {day.label}
              </span>
              <input
                type="time"
                className="rounded-xl border border-[#E5E7EB] bg-[#FFFCF8] px-3 py-2"
                value={hours[day.key]?.open || "09:00"}
                onChange={(e) =>
                  setHours({
                    ...hours,
                    [day.key]: {
                      ...hours[day.key],
                      open: e.target.value,
                    },
                  })
                }
              />
              <span className="text-gray-400">to</span>
              <input
                type="time"
                className="rounded-xl border border-[#E5E7EB] bg-[#FFFCF8] px-3 py-2"
                value={hours[day.key]?.close || "18:00"}
                onChange={(e) =>
                  setHours({
                    ...hours,
                    [day.key]: {
                      ...hours[day.key],
                      close: e.target.value,
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <label className={labelClass}>Weekly Off</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleWeeklyOff(day.key)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                weeklyOff.includes(day.key)
                  ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                  : "bg-white text-[#1F2937] border-[#E5E7EB] hover:border-[#1E3A8A]"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <label className={labelClass}>Holidays</label>
        <div className="flex gap-3">
          <input
            type="date"
            className={fieldClass}
            value={holidayInput}
            onChange={(e) => setHolidayInput(e.target.value)}
          />
          <button
            type="button"
            onClick={addHoliday}
            className="px-6 rounded-xl bg-[#F2F3F8] text-[#1E3A8A] font-medium whitespace-nowrap"
          >
            + Add
          </button>
        </div>

        {holidays.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {holidays.map((date) => (
              <span
                key={date}
                className="flex items-center gap-2 bg-[#F2F3F8] text-[#1E3A8A] px-3 py-1.5 rounded-full text-sm"
              >
                {date}
                <button
                  type="button"
                  onClick={() => removeHoliday(date)}
                  className="text-[#1E3A8A]/60 hover:text-red-600"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={instantBooking}
            onChange={(e) => setInstantBooking(e.target.checked)}
            className="h-5 w-5 accent-[#1E3A8A]"
          />
          <span className="text-sm font-medium">
            Instant Booking - let customers book without waiting for
            approval
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={calendarIntegration}
            onChange={(e) => setCalendarIntegration(e.target.checked)}
            className="h-5 w-5 accent-[#1E3A8A]"
          />
          <span className="text-sm font-medium">
            Calendar Integration - sync bookings with your calendar
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <StepNav onBack={onBack} onNext={handleNext} loading={saving} />
    </CardShell>
  );
}

// ---------------------------------------------------------------------
// Tab 7: KYC + final payment
// ---------------------------------------------------------------------

function Tab7Kyc({
  providerId,
  onBack,
}: {
  providerId: string;
  onBack: () => void;
}) {
  const toast = useToast();
  const [aadhaar, setAadhaar] = useState("");
  const [bankDetails, setBankDetails] = useState({
    bank_account_holder_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_name: "",
  });
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [chequeUploading, setChequeUploading] = useState(false);
  const [chequeUploaded, setChequeUploaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [kycSaved, setKycSaved] = useState(false);

  const handleChequeUpload = async () => {
    if (!chequeFile) return;
    try {
      setChequeUploading(true);
      const res = await uploadProviderDocument(
        providerId,
        "CANCELLED_CHEQUE",
        chequeFile
      );
      const url = res?.document?.document_url;
      if (url) {
        await updateProviderKyc(providerId, { cancelled_cheque_url: url });
      }
      setChequeUploaded(true);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setChequeUploading(false);
    }
  };

  const handleSaveKyc = async () => {
    setError("");
    try {
      setSaving(true);

      await updateProviderKyc(providerId, {
        aadhaar_number: aadhaar || undefined,
      });

      if (
        bankDetails.bank_account_holder_name &&
        bankDetails.bank_account_number &&
        bankDetails.bank_ifsc_code &&
        bankDetails.bank_name
      ) {
        await updateBankDetails(providerId, bankDetails);
      }

      setKycSaved(true);
    } catch (err) {
      console.error(err);
      setError("Unable to save KYC details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (kycSaved) {
    return (
      <div className="space-y-8">
        <CardShell title="KYC Documents">
          <p className="text-gray-500 mb-6">
            Upload your Aadhaar, PAN, GST certificate, Business License and
            Certifications. Your work-sample portfolio was already added in
            the Business Photos &amp; Video step.
          </p>
          <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <DocumentsSection />
          </div>
        </CardShell>

        <SubscriptionSection />
      </div>
    );
  }

  return (
    <CardShell
      title="KYC"
      subtitle="Last step - verify your identity and bank details, then complete registration."
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Aadhaar Number</label>
          <input
            className={fieldClass}
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value)}
            placeholder="XXXX XXXX XXXX"
          />
        </div>
      </div>

      <div className="mt-10">
        <h3 className="font-semibold text-lg mb-3">Bank Details</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Account Holder Name</label>
            <input
              className={fieldClass}
              value={bankDetails.bank_account_holder_name}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  bank_account_holder_name: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Bank Name</label>
            <input
              className={fieldClass}
              value={bankDetails.bank_name}
              onChange={(e) =>
                setBankDetails({ ...bankDetails, bank_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Account Number</label>
            <input
              className={fieldClass}
              value={bankDetails.bank_account_number}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  bank_account_number: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className={labelClass}>IFSC Code</label>
            <input
              className={fieldClass}
              value={bankDetails.bank_ifsc_code}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  bank_ifsc_code: e.target.value.toUpperCase(),
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-10">
        <label className={labelClass}>Cancelled Cheque</label>
        <div className="flex gap-3">
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(e) => setChequeFile(e.target.files?.[0] || null)}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={handleChequeUpload}
            disabled={!chequeFile || chequeUploading}
            className="px-6 rounded-xl bg-[#F2F3F8] text-[#1E3A8A] font-medium whitespace-nowrap disabled:opacity-50"
          >
            {chequeUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {chequeUploaded && (
          <p className="text-xs text-green-700 mt-1">
            ✓ Cancelled cheque uploaded
          </p>
        )}
      </div>

      {error && (
        <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <StepNav
        onBack={onBack}
        onNext={handleSaveKyc}
        nextLabel="Continue to Documents & Payment"
        loading={saving}
      />
    </CardShell>
  );
}

// ---------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------

export default function ProviderRegistrationWizard() {
  const [tab, setTab] = useState(1);
  const [providerId, setProviderId] = useState<string | null>(null);

  const [businessInfo, setBusinessInfo] = useState<BusinessInfoValues>({
    business_name: "",
    legal_entity_name: "",
    gst_number: "",
    pan_number: "",
    year_established: "",
    business_registration_number: "",
    entity_type: "",
    description: "",
  });

  const [contact, setContact] = useState<ContactValues>({
    contact_person: "",
    phone: "",
    whatsapp_number: "",
    email: "",
    website_url: "",
    facebook_url: "",
    instagram_url: "",
    youtube_url: "",
    password: "",
    confirm_password: "",
  });

  const [location, setLocation] = useState<LocationValues>({
    country: "India",
    state_id: "",
    district_id: "",
    location_id: "",
    area: "",
    postal_code: "",
    address: "",
    google_map_url: "",
    service_radius_km: "",
  });
  const [branches, setBranches] = useState<ProviderBranch[]>([]);

  // Restore an in-progress draft (Tab 1/2 text fields only - once an
  // account exists, later tabs are persisted server-side via their
  // own PATCH endpoints and provider_id in localStorage is what
  // matters for resuming).
  const isFirstPersistRun = useRef(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.businessInfo) setBusinessInfo(draft.businessInfo);
      if (draft.contact) setContact(draft.contact);

      const existingProviderId = localStorage.getItem("provider_id");
      if (existingProviderId && draft.tab && draft.tab > 2) {
        setProviderId(existingProviderId);
        setTab(draft.tab);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (isFirstPersistRun.current) {
      isFirstPersistRun.current = false;
      return;
    }
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ tab, businessInfo, contact })
      );
    } catch (err) {
      console.error(err);
    }
  }, [tab, businessInfo, contact]);

  return (
    <div className="min-h-screen bg-[#F8F6F2] py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <img
            src="/AppLogo%201.png"
            alt="OccasionX"
            className="h-16 mx-auto mb-5"
          />
          <h1 className="text-4xl font-bold text-[#1F2937]">
            Become an OccasionX Partner
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Join thousands of trusted service providers across India.
          </p>
        </div>

        <TabProgress current={tab} />

        {tab === 1 && (
          <Tab1BusinessInfo
            values={businessInfo}
            onChange={(patch) =>
              setBusinessInfo((prev) => ({ ...prev, ...patch }))
            }
            onNext={() => setTab(2)}
          />
        )}

        {tab === 2 && (
          <Tab2ContactDetails
            values={contact}
            onChange={(patch) => setContact((prev) => ({ ...prev, ...patch }))}
            businessInfo={businessInfo}
            onAccountCreated={(pid) => setProviderId(pid)}
            onNext={() => setTab(3)}
            onBack={() => setTab(1)}
          />
        )}

        {tab === 3 && providerId && (
          <Tab3Location
            values={location}
            onChange={(patch) => setLocation((prev) => ({ ...prev, ...patch }))}
            branches={branches}
            onBranchesChange={setBranches}
            providerId={providerId}
            onNext={() => setTab(4)}
            onBack={() => setTab(2)}
          />
        )}

        {tab === 4 && providerId && (
          <Tab4Services
            providerId={providerId}
            onNext={() => setTab(5)}
            onBack={() => setTab(3)}
          />
        )}

        {tab === 5 && providerId && (
          <Tab5Pricing
            providerId={providerId}
            onNext={() => setTab(6)}
            onBack={() => setTab(4)}
          />
        )}

        {tab === 6 && providerId && (
          <Tab6Availability
            providerId={providerId}
            onNext={() => setTab(7)}
            onBack={() => setTab(5)}
          />
        )}

        {tab === 7 && providerId && (
          <Tab7Kyc providerId={providerId} onBack={() => setTab(6)} />
        )}
      </div>
    </div>
  );
}
