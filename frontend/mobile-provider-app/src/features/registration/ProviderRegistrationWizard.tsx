import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";

import { registerProvider } from "@/features/auth/authApi";
import {
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
  type BusinessHours,
} from "@/features/registration/providerOnboardingApi";
import { getStates, getDistricts, getLocations, type StateDto, type DistrictDto, type LocationDto } from "@/features/registration/locationApi";
import { getCategories, getSubcategories, type Category, type Subcategory } from "@/features/services/catalogApi";
import { getProviderServices, createProviderService } from "@/features/services/providerServiceApi";
import { updateBankDetails } from "@/features/bank-details/providerBankApi";
import type { RNFile } from "@/features/portfolio/providerPortfolioApi";
import { WEB_APP_URL } from "@/core/api/client";

import PrimaryButton from "@/core/components/PrimaryButton";
import { Screen } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "ProviderRegister">;

// FastAPI's 422 validation-error responses put `detail` as an ARRAY of
// {type, loc, msg, input} objects, not a string - passing that straight
// into <Text>{error}</Text> crashes the whole screen to blank white
// ("Objects are not valid as a React child"). Normalizes any shape down
// to a displayable string - see prior fix in the old ProviderRegisterScreen.
function extractErrorMessage(e: any, fallback: string): string {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === "string" ? d : d?.msg)).filter(Boolean).join(" ") || fallback;
  }
  if (detail && typeof detail === "object") return (detail as any).msg || fallback;
  return fallback;
}

const TAB_LABELS = ["Business Info", "Contact", "Location", "Services", "Pricing", "Availability", "KYC"];

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

const PAYMENT_MODE_OPTIONS = ["UPI", "Card", "Cash", "Bank Transfer", "Net Banking"];
const ENTITY_TYPE_OPTIONS = ["Individual", "Partnership", "LLP", "Pvt Ltd", "NGO", "Others"];

// ---------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------

function Progress({ current }: { current: number }) {
  return (
    <View style={s.progressWrap}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${(current / TAB_LABELS.length) * 100}%` }]} />
      </View>
      <Text style={s.progressText}>
        Step {current} of {TAB_LABELS.length} - {TAB_LABELS[current - 1]}
      </Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

function Chips<T extends string>({
  options,
  labels,
  value,
  onSelect,
  disabled,
}: {
  options: T[];
  labels?: Record<string, string>;
  value: T | null;
  onSelect: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={s.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          disabled={disabled}
          style={[s.chip, value === opt && s.chipActive, disabled && { opacity: 0.4 }]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[s.chipText, value === opt && s.chipTextActive]}>{labels?.[opt] || opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return (
    <View style={s.errorBox}>
      <Text style={s.errorText}>{error}</Text>
    </View>
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
    if (!values.business_name.trim()) return setError("Business name is required.");
    if (!values.entity_type) return setError("Please select a business type.");
    setError("");
    onNext();
  };

  return (
    <View>
      <Text style={s.cardTitle}>Business Information</Text>
      <Text style={s.cardSubtitle}>
        Tell customers who you are - your logo, cover photo and promotional video are added right after
        you verify your mobile number in the next step.
      </Text>

      <Field label="Business Name *">
        <TextInput style={s.input} value={values.business_name} onChangeText={(v) => onChange({ business_name: v })} placeholder="e.g. Sunrise Events & Catering" />
      </Field>
      <Field label="Legal Entity Name">
        <TextInput style={s.input} value={values.legal_entity_name} onChangeText={(v) => onChange({ legal_entity_name: v })} placeholder="As registered with the government" />
      </Field>
      <Field label="GST Number (Optional)">
        <TextInput style={s.input} value={values.gst_number} onChangeText={(v) => onChange({ gst_number: v })} autoCapitalize="characters" placeholder="22AAAAA0000A1Z5" />
      </Field>
      <Field label="PAN Number">
        <TextInput style={s.input} value={values.pan_number} onChangeText={(v) => onChange({ pan_number: v.toUpperCase() })} autoCapitalize="characters" placeholder="ABCDE1234F" />
      </Field>
      <Field label="Year Established">
        <TextInput style={s.input} value={values.year_established} onChangeText={(v) => onChange({ year_established: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="2018" />
      </Field>
      <Field label="Business Registration Number">
        <TextInput style={s.input} value={values.business_registration_number} onChangeText={(v) => onChange({ business_registration_number: v })} />
      </Field>
      <Field label="Business Type *">
        <Chips options={ENTITY_TYPE_OPTIONS} value={values.entity_type || null} onSelect={(v) => onChange({ entity_type: v })} />
      </Field>
      <Field label="Business Description">
        <TextInput
          style={[s.input, s.textArea]}
          value={values.description}
          onChangeText={(v) => onChange({ description: v })}
          multiline
          placeholder="Describe your services, specialties and what makes you stand out..."
        />
      </Field>

      <ErrorBox error={error} />
      <PrimaryButton label="Continue" onPress={handleNext} style={s.button} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Tab 2: Contact Details (+ OTP + account creation + media)
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

function Tab2Contact({
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
  onAccountCreated: (providerId: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [testOtp, setTestOtp] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneToken, setPhoneToken] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  // Media (Tab 1 fields that need a provider_id, uploaded here once
  // the account exists).
  const [uploadingMedia, setUploadingMedia] = useState<"logo" | "cover" | "video" | null>(null);
  const [mediaDone, setMediaDone] = useState({ logo: false, cover: false, video: false });

  const openTerms = () => {
    WebBrowser.openBrowserAsync(`${WEB_APP_URL}/terms/provider`).catch(() => {
      Alert.alert("Couldn't open the Terms & Conditions. Please try again.");
    });
  };

  const handleSendOtp = async () => {
    setError("");
    const digits = values.phone.replace(/\D/g, "");
    if (digits.length !== 10) return setError("Enter a valid 10-digit mobile number.");
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
    } catch (e: any) {
      setError(extractErrorMessage(e, "Unable to send OTP. Please try again."));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!otpCode.trim()) return setError("Enter the OTP sent to your mobile.");
    try {
      setOtpVerifying(true);
      const digits = values.phone.replace(/\D/g, "");
      const res = await verifyRegistrationOtp(digits, otpCode.trim());
      setPhoneVerified(true);
      setPhoneToken(res.phone_verification_token);
    } catch (e: any) {
      setError(extractErrorMessage(e, "Invalid OTP. Please try again."));
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleCreateAccount = async () => {
    setError("");
    if (!values.contact_person.trim()) return setError("Contact person name is required.");
    if (!phoneVerified) return setError("Please verify your mobile number first.");
    if (!values.email.trim()) return setError("Email address is required.");
    if (values.password.length < 6) return setError("Password must be at least 6 characters.");
    if (values.password !== values.confirm_password) return setError("Passwords do not match.");
    if (!agreedToTerms) return setError("Please agree to the Service Provider Terms & Conditions before continuing.");

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
        year_established: businessInfo.year_established ? Number(businessInfo.year_established) : undefined,
        business_registration_number: businessInfo.business_registration_number || undefined,
        entity_type: businessInfo.entity_type || undefined,

        contact_person: values.contact_person,
        whatsapp_number: values.whatsapp_number || undefined,
        website_url: values.website_url || undefined,
        facebook_url: values.facebook_url || undefined,
        instagram_url: values.instagram_url || undefined,
        youtube_url: values.youtube_url || undefined,
      });

      setProviderId(response.provider_id);
      setAccountCreated(true);
      onAccountCreated(response.provider_id);
    } catch (e: any) {
      setError(extractErrorMessage(e, "Registration failed. Please try again."));
    } finally {
      setCreatingAccount(false);
    }
  };

  const pickAndUpload = async (kind: "logo" | "cover" | "video") => {
    if (!providerId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "video" ? ["videos"] : ["images"],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const uriParts = asset.uri.split(".");
    const ext = uriParts[uriParts.length - 1] || (kind === "video" ? "mp4" : "jpg");
    const file: RNFile = {
      uri: asset.uri,
      name: asset.fileName || `${kind}.${ext}`,
      type: asset.mimeType || (kind === "video" ? `video/${ext}` : `image/${ext}`),
    };

    try {
      setUploadingMedia(kind);
      if (kind === "logo") await uploadProviderLogo(providerId, file);
      if (kind === "cover") await uploadProviderCoverImage(providerId, file);
      if (kind === "video") await uploadProviderPromotionalVideo(providerId, file);
      setMediaDone((prev) => ({ ...prev, [kind]: true }));
    } catch (e: any) {
      Alert.alert("Upload failed", extractErrorMessage(e, "Please try again."));
    } finally {
      setUploadingMedia(null);
    }
  };

  if (accountCreated && providerId) {
    return (
      <View>
        <Text style={s.cardTitle}>Business Photos & Video</Text>
        <Text style={s.cardSubtitle}>
          Add your logo, cover image and promotional video - now that your account exists, these can be
          attached to your profile. You can add more portfolio photos later from your dashboard.
        </Text>

        {resuming && (
          <View style={s.infoBox}>
            <Text style={s.infoText}>
              Welcome back! We've picked up your existing registration - please re-check the Location,
              Services, Pricing, Availability and KYC steps ahead, since anything entered there before
              wasn't saved.
            </Text>
          </View>
        )}

        {(["logo", "cover", "video"] as const).map((kind) => (
          <View key={kind} style={{ marginTop: 14 }}>
            <Text style={s.label}>
              {kind === "logo" ? "Logo" : kind === "cover" ? "Cover Image" : "Promotional Video"}
            </Text>
            <PrimaryButton
              label={
                uploadingMedia === kind
                  ? "Uploading..."
                  : mediaDone[kind]
                  ? `✓ ${kind === "logo" ? "Logo" : kind === "cover" ? "Cover" : "Video"} uploaded - Replace`
                  : `Choose ${kind === "video" ? "Video" : "Image"}`
              }
              onPress={() => pickAndUpload(kind)}
              loading={uploadingMedia === kind}
              variant="outline"
            />
          </View>
        ))}

        <PrimaryButton label="Continue to Business Location" onPress={onNext} style={s.button} />
      </View>
    );
  }

  return (
    <View>
      <Text style={s.cardTitle}>Contact Details</Text>
      <Text style={s.cardSubtitle}>How customers and OccasionX can reach you.</Text>

      <Field label="Contact Person *">
        <TextInput style={s.input} value={values.contact_person} onChangeText={(v) => onChange({ contact_person: v })} />
      </Field>
      <Field label="Email Address *">
        <TextInput style={s.input} value={values.email} onChangeText={(v) => onChange({ email: v })} autoCapitalize="none" keyboardType="email-address" />
      </Field>

      <Field label="Mobile Number *">
        <View style={s.row}>
          <TextInput
            style={[s.input, s.flex1]}
            value={values.phone}
            editable={!phoneVerified}
            onChangeText={(v) => onChange({ phone: v })}
            keyboardType="phone-pad"
            placeholder="10-digit mobile number"
          />
          <Pressable
            style={[s.otpBtn, (otpSending || phoneVerified) && { opacity: 0.5 }]}
            onPress={handleSendOtp}
            disabled={otpSending || phoneVerified}
          >
            <Text style={s.otpBtnText}>
              {phoneVerified ? "Verified ✓" : otpSent ? "Resend OTP" : otpSending ? "Sending..." : "Send OTP"}
            </Text>
          </Pressable>
        </View>

        {otpSent && !phoneVerified && (
          <View style={{ marginTop: 10 }}>
            {resuming && (
              <View style={s.infoBox}>
                <Text style={s.infoText}>
                  We found an incomplete registration for this number. Verify the OTP to pick up where you
                  left off.
                </Text>
              </View>
            )}
            <View style={s.row}>
              <TextInput
                style={[s.input, s.flex1]}
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="Enter 6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable style={[s.otpBtn, s.otpBtnFilled]} onPress={handleVerifyOtp} disabled={otpVerifying}>
                <Text style={s.otpBtnFilledText}>{otpVerifying ? "Verifying..." : "Verify"}</Text>
              </Pressable>
            </View>
            {testOtp && (
              <View style={s.testBox}>
                <Text style={s.testText}>
                  Test mode - no WhatsApp message was actually sent. OTP {testOtp} has been filled in for
                  you.
                </Text>
              </View>
            )}
          </View>
        )}
      </Field>

      <Field label="WhatsApp Number">
        <TextInput style={s.input} value={values.whatsapp_number} onChangeText={(v) => onChange({ whatsapp_number: v })} placeholder="Leave blank if same as mobile" keyboardType="phone-pad" />
      </Field>
      <Field label="Website">
        <TextInput style={s.input} value={values.website_url} onChangeText={(v) => onChange({ website_url: v })} placeholder="https://" autoCapitalize="none" />
      </Field>
      <Field label="Facebook">
        <TextInput style={s.input} value={values.facebook_url} onChangeText={(v) => onChange({ facebook_url: v })} placeholder="https://facebook.com/..." autoCapitalize="none" />
      </Field>
      <Field label="Instagram">
        <TextInput style={s.input} value={values.instagram_url} onChangeText={(v) => onChange({ instagram_url: v })} placeholder="https://instagram.com/..." autoCapitalize="none" />
      </Field>
      <Field label="YouTube">
        <TextInput style={s.input} value={values.youtube_url} onChangeText={(v) => onChange({ youtube_url: v })} placeholder="https://youtube.com/..." autoCapitalize="none" />
      </Field>
      <Field label="Password *">
        <TextInput style={s.input} value={values.password} onChangeText={(v) => onChange({ password: v })} secureTextEntry />
      </Field>
      <Field label="Confirm Password *">
        <TextInput style={s.input} value={values.confirm_password} onChangeText={(v) => onChange({ confirm_password: v })} secureTextEntry />
      </Field>

      <Pressable style={s.termsRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
        <Ionicons name={agreedToTerms ? "checkbox" : "square-outline"} size={20} color={colors.primary} />
        <Text style={s.termsText}>
          I have read and agree to the{" "}
          <Text style={s.termsLink} onPress={openTerms}>
            Service Provider Terms & Conditions
          </Text>
        </Text>
      </Pressable>

      <ErrorBox error={error} />

      <PrimaryButton label="Create Account & Continue" onPress={handleCreateAccount} loading={creatingAccount} style={s.button} />
      <PrimaryButton label="Back" onPress={onBack} variant="outline" style={s.button} />
    </View>
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
  providerId,
  onNext,
  onBack,
}: {
  values: LocationValues;
  onChange: (patch: Partial<LocationValues>) => void;
  providerId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [states, setStates] = useState<StateDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStates().then(setStates).catch(() => {});
  }, []);
  useEffect(() => {
    if (!values.state_id) return setDistricts([]);
    getDistricts(Number(values.state_id)).then(setDistricts).catch(() => {});
  }, [values.state_id]);
  useEffect(() => {
    if (!values.district_id) return setLocations([]);
    getLocations(Number(values.district_id)).then(setLocations).catch(() => {});
  }, [values.district_id]);

  const handleNext = async () => {
    setError("");
    if (!values.state_id || !values.district_id || !values.location_id) {
      return setError("Please select your state, district and city.");
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
        service_radius_km: values.service_radius_km ? Number(values.service_radius_km) : undefined,
        branches: [],
      });
      onNext();
    } catch (e: any) {
      setError(extractErrorMessage(e, "Unable to save your location. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <Text style={s.cardTitle}>Business Location</Text>
      <Text style={s.cardSubtitle}>Where you're based and how far you're willing to travel for events.</Text>

      <Field label="Country">
        <TextInput style={s.input} value={values.country} onChangeText={(v) => onChange({ country: v })} />
      </Field>
      <Field label="Pincode">
        <TextInput style={s.input} value={values.postal_code} onChangeText={(v) => onChange({ postal_code: v })} keyboardType="number-pad" />
      </Field>
      <Field label="State *">
        <Chips
          options={states.map((st) => String(st.id))}
          labels={Object.fromEntries(states.map((st) => [String(st.id), st.name]))}
          value={values.state_id || null}
          onSelect={(v) => onChange({ state_id: v, district_id: "", location_id: "" })}
        />
      </Field>
      {!!districts.length && (
        <Field label="District *">
          <Chips
            options={districts.map((d) => String(d.id))}
            labels={Object.fromEntries(districts.map((d) => [String(d.id), d.name]))}
            value={values.district_id || null}
            onSelect={(v) => onChange({ district_id: v, location_id: "" })}
          />
        </Field>
      )}
      {!!locations.length && (
        <Field label="City *">
          <Chips
            options={locations.map((l) => String(l.id))}
            labels={Object.fromEntries(locations.map((l) => [String(l.id), l.name]))}
            value={values.location_id || null}
            onSelect={(v) => onChange({ location_id: v })}
          />
        </Field>
      )}
      <Field label="Area">
        <TextInput style={s.input} value={values.area} onChangeText={(v) => onChange({ area: v })} placeholder="Locality / neighbourhood" />
      </Field>
      <Field label="Google Map Location">
        <TextInput style={s.input} value={values.google_map_url} onChangeText={(v) => onChange({ google_map_url: v })} placeholder="Paste a Google Maps link" autoCapitalize="none" />
      </Field>
      <Field label="Service Radius (KM)">
        <TextInput style={s.input} value={values.service_radius_km} onChangeText={(v) => onChange({ service_radius_km: v.replace(/\D/g, "") })} keyboardType="number-pad" />
      </Field>
      <Field label="Business Address">
        <TextInput style={[s.input, s.textArea]} value={values.address} onChangeText={(v) => onChange({ address: v })} multiline />
      </Field>

      <ErrorBox error={error} />
      <PrimaryButton label="Continue" onPress={handleNext} loading={saving} style={s.button} />
      <PrimaryButton label="Back" onPress={onBack} variant="outline" style={s.button} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Tab 4: Services
// ---------------------------------------------------------------------

function Tab4Services({ providerId, onNext, onBack }: { providerId: string; onNext: () => void; onBack: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [primarySubcategories, setPrimarySubcategories] = useState<Subcategory[]>([]);
  const [primarySubcategory, setPrimarySubcategory] = useState("");

  const [additionalCategory, setAdditionalCategory] = useState("");
  const [additionalSubcategories, setAdditionalSubcategories] = useState<Subcategory[]>([]);
  const [additionalSubcategory, setAdditionalSubcategory] = useState("");
  const [additionalServices, setAdditionalServices] = useState<{ category_id: string; subcategory_id: string; label: string }[]>([]);

  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [teamSize, setTeamSize] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);
  useEffect(() => {
    if (!primaryCategory) return setPrimarySubcategories([]);
    getSubcategories(primaryCategory).then(setPrimarySubcategories).catch(() => {});
  }, [primaryCategory]);
  useEffect(() => {
    if (!additionalCategory) return setAdditionalSubcategories([]);
    getSubcategories(additionalCategory).then(setAdditionalSubcategories).catch(() => {});
  }, [additionalCategory]);

  const addAdditionalService = () => {
    if (!additionalCategory) return;
    const category = categories.find((c) => c.id === additionalCategory);
    const subcategory = additionalSubcategories.find((s2) => s2.id === additionalSubcategory);
    setAdditionalServices((prev) => [
      ...prev,
      {
        category_id: additionalCategory,
        subcategory_id: additionalSubcategory,
        label: `${category?.name || ""}${subcategory ? " - " + subcategory.name : ""}`,
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

  const handleNext = async () => {
    setError("");
    if (!primaryCategory) return setError("Please select your primary category.");
    try {
      setSaving(true);
      await assignProviderCategories(providerId, [
        { category_id: primaryCategory, subcategory_id: primarySubcategory || undefined },
        ...additionalServices.map((sv) => ({ category_id: sv.category_id, subcategory_id: sv.subcategory_id || undefined })),
      ]);
      await updateProviderServicesTab(providerId, {
        languages_spoken: languages,
        years_of_experience: yearsExperience ? Number(yearsExperience) : undefined,
        team_size: teamSize ? Number(teamSize) : undefined,
      });

      // Picking a category/subcategory above reads as "adding a service"
      // from the provider's point of view, but assignProviderCategories
      // only tags which categories this provider serves - create an
      // actual named Service listing per chosen category/subcategory too
      // (pricing for it is added on the dashboard's Pricing screen
      // later), so "My Services" isn't empty right after registration.
      const primaryCategoryObj = categories.find((c) => c.id === primaryCategory);
      const primarySubcategoryObj = primarySubcategories.find((sc) => sc.id === primarySubcategory);
      const listings = [
        {
          category_id: primaryCategory,
          subcategory_id: primarySubcategory || undefined,
          name: (primaryCategoryObj?.name || "Service") + (primarySubcategoryObj ? ` - ${primarySubcategoryObj.name}` : ""),
        },
        ...additionalServices.map((sv) => ({ category_id: sv.category_id, subcategory_id: sv.subcategory_id || undefined, name: sv.label || "Service" })),
      ];
      const existingServices = await getProviderServices(providerId).catch(() => []);
      for (const listing of listings) {
        const alreadyExists = existingServices.some(
          (svc) => svc.category_id === listing.category_id && (svc.subcategory_id || undefined) === listing.subcategory_id
        );
        if (alreadyExists) continue;
        await createProviderService(providerId, listing);
      }

      onNext();
    } catch (e: any) {
      setError(extractErrorMessage(e, "Unable to save your services. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <Text style={s.cardTitle}>Services</Text>
      <Text style={s.cardSubtitle}>What kind of events and services you offer.</Text>

      <Field label="Primary Category *">
        <Chips
          options={categories.map((c) => c.id)}
          labels={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
          value={primaryCategory || null}
          onSelect={(v) => {
            setPrimaryCategory(v);
            setPrimarySubcategory("");
          }}
        />
      </Field>
      {!!primarySubcategories.length && (
        <Field label="Sub Category">
          <Chips
            options={primarySubcategories.map((sc) => sc.id)}
            labels={Object.fromEntries(primarySubcategories.map((sc) => [sc.id, sc.name]))}
            value={primarySubcategory || null}
            onSelect={setPrimarySubcategory}
          />
        </Field>
      )}
      <Field label="Years of Experience">
        <TextInput style={s.input} value={yearsExperience} onChangeText={(v) => setYearsExperience(v.replace(/\D/g, ""))} keyboardType="number-pad" />
      </Field>
      <Field label="Team Size">
        <TextInput style={s.input} value={teamSize} onChangeText={(v) => setTeamSize(v.replace(/\D/g, ""))} keyboardType="number-pad" />
      </Field>

      <Text style={s.sectionHeading}>Additional Services</Text>
      <Field label="Category">
        <Chips
          options={categories.map((c) => c.id)}
          labels={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
          value={additionalCategory || null}
          onSelect={setAdditionalCategory}
        />
      </Field>
      {!!additionalSubcategories.length && (
        <Field label="Subcategory">
          <Chips
            options={additionalSubcategories.map((sc) => sc.id)}
            labels={Object.fromEntries(additionalSubcategories.map((sc) => [sc.id, sc.name]))}
            value={additionalSubcategory || null}
            onSelect={setAdditionalSubcategory}
          />
        </Field>
      )}
      <PrimaryButton label="+ Add Service" onPress={addAdditionalService} variant="outline" style={{ marginTop: 10 }} />

      {!!additionalServices.length && (
        <View style={s.tagWrap}>
          {additionalServices.map((sv, i) => (
            <View key={i} style={s.tag}>
              <Text style={s.tagText}>{sv.label}</Text>
              <Pressable onPress={() => removeAdditionalService(i)}>
                <Ionicons name="close" size={14} color={colors.primary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Field label="Languages Spoken">
        <View style={s.row}>
          <TextInput
            style={[s.input, s.flex1]}
            value={languageInput}
            onChangeText={setLanguageInput}
            placeholder="e.g. English, Hindi, Telugu"
            onSubmitEditing={addLanguage}
          />
          <Pressable style={s.otpBtn} onPress={addLanguage}>
            <Text style={s.otpBtnText}>+ Add</Text>
          </Pressable>
        </View>
      </Field>
      {!!languages.length && (
        <View style={s.tagWrap}>
          {languages.map((lang) => (
            <View key={lang} style={s.tag}>
              <Text style={s.tagText}>{lang}</Text>
              <Pressable onPress={() => setLanguages(languages.filter((l) => l !== lang))}>
                <Ionicons name="close" size={14} color={colors.primary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <ErrorBox error={error} />
      <PrimaryButton label="Continue" onPress={handleNext} loading={saving} style={s.button} />
      <PrimaryButton label="Back" onPress={onBack} variant="outline" style={s.button} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Tab 5: Pricing
// ---------------------------------------------------------------------

function Tab5Pricing({ providerId, onNext, onBack }: { providerId: string; onNext: () => void; onBack: () => void }) {
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
    setPaymentModes((prev) => (prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]));
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
        advance_percentage: advancePercentage ? Number(advancePercentage) : undefined,
        payment_modes: paymentModes,
        cancellation_policy: cancellationPolicy || undefined,
      });
      onNext();
    } catch (e: any) {
      setError(extractErrorMessage(e, "Unable to save pricing details. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <Text style={s.cardTitle}>Pricing</Text>
      <Text style={s.cardSubtitle}>Help customers understand your rates before they reach out.</Text>

      <Field label="Starting Price (₹)">
        <TextInput style={s.input} value={startingPrice} onChangeText={(v) => setStartingPrice(v.replace(/\D/g, ""))} keyboardType="number-pad" />
      </Field>
      <Field label="Advance Percentage (%)">
        <TextInput style={s.input} value={advancePercentage} onChangeText={(v) => setAdvancePercentage(v.replace(/\D/g, ""))} keyboardType="number-pad" />
      </Field>
      <Field label="Price Range - Min (₹)">
        <TextInput style={s.input} value={priceMin} onChangeText={(v) => setPriceMin(v.replace(/\D/g, ""))} keyboardType="number-pad" />
      </Field>
      <Field label="Price Range - Max (₹)">
        <TextInput style={s.input} value={priceMax} onChangeText={(v) => setPriceMax(v.replace(/\D/g, ""))} keyboardType="number-pad" />
      </Field>

      <Pressable style={s.termsRow} onPress={() => setCustomQuotation(!customQuotation)}>
        <Ionicons name={customQuotation ? "checkbox" : "square-outline"} size={20} color={colors.primary} />
        <Text style={s.termsText}>Custom Quotation Available</Text>
      </Pressable>

      <Field label="Payment Modes">
        <View style={s.chipRow}>
          {PAYMENT_MODE_OPTIONS.map((mode) => (
            <Pressable key={mode} style={[s.chip, paymentModes.includes(mode) && s.chipActive]} onPress={() => toggleMode(mode)}>
              <Text style={[s.chipText, paymentModes.includes(mode) && s.chipTextActive]}>{mode}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Cancellation Policy">
        <TextInput
          style={[s.input, s.textArea]}
          value={cancellationPolicy}
          onChangeText={setCancellationPolicy}
          multiline
          placeholder="e.g. Cancellations allowed up to 24 hours before the event; no refund after."
        />
      </Field>

      <ErrorBox error={error} />
      <PrimaryButton label="Continue" onPress={handleNext} loading={saving} style={s.button} />
      <PrimaryButton label="Back" onPress={onBack} variant="outline" style={s.button} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Tab 6: Availability
// ---------------------------------------------------------------------

function Tab6Availability({ providerId, onNext, onBack }: { providerId: string; onNext: () => void; onBack: () => void }) {
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [weeklyOff, setWeeklyOff] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [holidayInput, setHolidayInput] = useState("");
  const [instantBooking, setInstantBooking] = useState(false);
  const [calendarIntegration, setCalendarIntegration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleWeeklyOff = (day: string) => {
    setWeeklyOff((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const addHoliday = () => {
    const v = holidayInput.trim();
    if (!v || holidays.includes(v)) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      Alert.alert("Use YYYY-MM-DD format, e.g. 2026-12-25");
      return;
    }
    setHolidays([...holidays, v]);
    setHolidayInput("");
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
    } catch (e: any) {
      setError(extractErrorMessage(e, "Unable to save availability. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <Text style={s.cardTitle}>Availability</Text>
      <Text style={s.cardSubtitle}>Let customers know when you're open for bookings.</Text>

      <Text style={s.sectionHeading}>Business Hours</Text>
      {WEEKDAYS.map((day) => (
        <View key={day.key} style={s.hoursRow}>
          <Text style={s.hoursDay}>{day.label}</Text>
          <TextInput
            style={[s.input, s.hoursInput]}
            value={hours[day.key]?.open || "09:00"}
            onChangeText={(v) => setHours({ ...hours, [day.key]: { ...hours[day.key], open: v } })}
            placeholder="09:00"
          />
          <Text style={s.hoursTo}>to</Text>
          <TextInput
            style={[s.input, s.hoursInput]}
            value={hours[day.key]?.close || "18:00"}
            onChangeText={(v) => setHours({ ...hours, [day.key]: { ...hours[day.key], close: v } })}
            placeholder="18:00"
          />
        </View>
      ))}

      <Field label="Weekly Off">
        <View style={s.chipRow}>
          {WEEKDAYS.map((day) => (
            <Pressable key={day.key} style={[s.chip, weeklyOff.includes(day.key) && s.chipActive]} onPress={() => toggleWeeklyOff(day.key)}>
              <Text style={[s.chipText, weeklyOff.includes(day.key) && s.chipTextActive]}>{day.label}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Holidays (YYYY-MM-DD)">
        <View style={s.row}>
          <TextInput style={[s.input, s.flex1]} value={holidayInput} onChangeText={setHolidayInput} placeholder="2026-12-25" />
          <Pressable style={s.otpBtn} onPress={addHoliday}>
            <Text style={s.otpBtnText}>+ Add</Text>
          </Pressable>
        </View>
      </Field>
      {!!holidays.length && (
        <View style={s.tagWrap}>
          {holidays.map((date) => (
            <View key={date} style={s.tag}>
              <Text style={s.tagText}>{date}</Text>
              <Pressable onPress={() => setHolidays(holidays.filter((d) => d !== date))}>
                <Ionicons name="close" size={14} color={colors.primary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable style={s.termsRow} onPress={() => setInstantBooking(!instantBooking)}>
        <Ionicons name={instantBooking ? "checkbox" : "square-outline"} size={20} color={colors.primary} />
        <Text style={s.termsText}>Instant Booking - let customers book without waiting for approval</Text>
      </Pressable>
      <Pressable style={s.termsRow} onPress={() => setCalendarIntegration(!calendarIntegration)}>
        <Ionicons name={calendarIntegration ? "checkbox" : "square-outline"} size={20} color={colors.primary} />
        <Text style={s.termsText}>Calendar Integration - sync bookings with your calendar</Text>
      </Pressable>

      <ErrorBox error={error} />
      <PrimaryButton label="Continue" onPress={handleNext} loading={saving} style={s.button} />
      <PrimaryButton label="Back" onPress={onBack} variant="outline" style={s.button} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Tab 7: KYC (Aadhaar + bank details) -> hands off to ProviderSetup
// (documents + registration fee, already built) for the final step.
// ---------------------------------------------------------------------

function Tab7Kyc({
  providerId,
  businessName,
  email,
  onBack,
  onDone,
}: {
  providerId: string;
  businessName: string;
  email: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [aadhaar, setAadhaar] = useState("");
  const [bankDetails, setBankDetails] = useState({
    bank_account_holder_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_name: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSaveKyc = async () => {
    setError("");
    try {
      setSaving(true);
      await updateProviderKyc(providerId, { aadhaar_number: aadhaar || undefined });

      if (
        bankDetails.bank_account_holder_name &&
        bankDetails.bank_account_number &&
        bankDetails.bank_ifsc_code &&
        bankDetails.bank_name
      ) {
        await updateBankDetails(providerId, bankDetails);
      }

      onDone();
    } catch (e: any) {
      setError(extractErrorMessage(e, "Unable to save KYC details. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <Text style={s.cardTitle}>KYC</Text>
      <Text style={s.cardSubtitle}>
        Last step - verify your identity and bank details, then upload your documents and pay the
        registration fee.
      </Text>

      <Field label="Aadhaar Number">
        <TextInput style={s.input} value={aadhaar} onChangeText={setAadhaar} placeholder="XXXX XXXX XXXX" keyboardType="number-pad" />
      </Field>

      <Text style={s.sectionHeading}>Bank Details</Text>
      <Field label="Account Holder Name">
        <TextInput style={s.input} value={bankDetails.bank_account_holder_name} onChangeText={(v) => setBankDetails({ ...bankDetails, bank_account_holder_name: v })} />
      </Field>
      <Field label="Bank Name">
        <TextInput style={s.input} value={bankDetails.bank_name} onChangeText={(v) => setBankDetails({ ...bankDetails, bank_name: v })} />
      </Field>
      <Field label="Account Number">
        <TextInput style={s.input} value={bankDetails.bank_account_number} onChangeText={(v) => setBankDetails({ ...bankDetails, bank_account_number: v })} keyboardType="number-pad" />
      </Field>
      <Field label="IFSC Code">
        <TextInput style={s.input} value={bankDetails.bank_ifsc_code} onChangeText={(v) => setBankDetails({ ...bankDetails, bank_ifsc_code: v.toUpperCase() })} autoCapitalize="characters" />
      </Field>

      <ErrorBox error={error} />
      <PrimaryButton label="Continue to Documents & Payment" onPress={handleSaveKyc} loading={saving} style={s.button} />
      <PrimaryButton label="Back" onPress={onBack} variant="outline" style={s.button} />
    </View>
  );
}

// ---------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------

export default function ProviderRegistrationWizard({ navigation }: Props) {
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Image source={require("../../../assets/logo-full.png")} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>Become an OccasionX Partner</Text>
        <Text style={s.subtitle}>Join thousands of trusted service providers across India.</Text>

        <Progress current={tab} />

        {tab === 1 && (
          <Tab1BusinessInfo
            values={businessInfo}
            onChange={(patch) => setBusinessInfo((prev) => ({ ...prev, ...patch }))}
            onNext={() => setTab(2)}
          />
        )}

        {tab === 2 && (
          <Tab2Contact
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
            providerId={providerId}
            onNext={() => setTab(4)}
            onBack={() => setTab(2)}
          />
        )}

        {tab === 4 && providerId && <Tab4Services providerId={providerId} onNext={() => setTab(5)} onBack={() => setTab(3)} />}

        {tab === 5 && providerId && <Tab5Pricing providerId={providerId} onNext={() => setTab(6)} onBack={() => setTab(4)} />}

        {tab === 6 && providerId && <Tab6Availability providerId={providerId} onNext={() => setTab(7)} onBack={() => setTab(5)} />}

        {tab === 7 && providerId && (
          <Tab7Kyc
            providerId={providerId}
            businessName={businessInfo.business_name}
            email={contact.email}
            onBack={() => setTab(6)}
            onDone={() =>
              navigation.replace("ProviderSetup", {
                providerId,
                email: contact.email,
                businessName: businessInfo.business_name,
              })
            }
          />
        )}

        {tab === 1 && (
          <PrimaryButton
            label="Already have an account? Sign In"
            onPress={() => navigation.navigate("SignIn")}
            variant="outline"
            style={s.button}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40 },
  logo: { width: 140, height: 41, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center" },
  subtitle: { color: colors.textMuted, textAlign: "center", marginTop: 4, marginBottom: 16 },

  progressWrap: { marginBottom: 20 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: colors.primary },
  progressText: { marginTop: 8, fontSize: 12, color: colors.textMuted, fontWeight: "600" },

  cardTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  cardSubtitle: { color: colors.textMuted, marginTop: 6, fontSize: 13, lineHeight: 18 },
  sectionHeading: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 22, marginBottom: 4 },

  label: { color: colors.text, marginBottom: 6, fontWeight: "500", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.background,
  },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  flex1: { flex: 1 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.white, fontWeight: "600" },

  otpBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otpBtnText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  otpBtnFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  otpBtnFilledText: { color: colors.white, fontWeight: "600", fontSize: 13 },

  infoBox: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 8, padding: 10, marginBottom: 8 },
  infoText: { color: "#1D4ED8", fontSize: 12 },
  testBox: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 8, padding: 10, marginTop: 8 },
  testText: { color: "#B45309", fontSize: 12 },
  errorBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 8, padding: 10, marginTop: 16 },
  errorText: { color: colors.danger, fontSize: 13 },

  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16 },
  termsText: { flex: 1, color: colors.text, fontSize: 13 },
  termsLink: { color: colors.primary, fontWeight: "600" },

  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagText: { color: colors.primary, fontSize: 12, fontWeight: "500" },

  hoursRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  hoursDay: { width: 88, fontSize: 13, fontWeight: "500", color: colors.text },
  hoursInput: { flex: 1, paddingVertical: 8 },
  hoursTo: { color: colors.textMuted, fontSize: 12 },

  button: { marginTop: 16 },
});
