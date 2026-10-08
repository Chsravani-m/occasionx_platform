"use client";

import Link from "next/link";
import { useToast, useConfirm } from "@/context/NotificationContext";
import { useEffect, useState } from "react";
import { getProfile } from "@/services/profileApi";
import { updateProfile } from "@/services/profileApi";
import { getCurrentUser } from "@/utils/auth";

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer Account",
  USER: "Customer Account",
  PROVIDER: "Provider Account",
  ADMIN: "Admin Account",
  SUPER_ADMIN: "Super Admin Account",
};

interface UserProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;

  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;

  bio?: string;
  profile_image_url?: string;
}

export function ProfilePage() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [role, setRole] = useState<string | undefined>(undefined);

  const roleLabel = role ? ROLE_LABELS[role] || role : "Account";

 useEffect(() => {
  const user = getCurrentUser();

  // Not logged in - send straight to Sign In rather than firing a
  // request that will 401, same pattern /cart already uses.
  if (!user?.id) {
    window.location.href = "/signin";
    return;
  }

  setRole(user.role);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err: any) {
      console.error("Failed to load profile", err);

      // Session expired/invalidated mid-visit (token cleared,
      // revoked, etc.) - the initial getCurrentUser() check above
      // can't catch this since it only looks at localStorage, not
      // whether the token still works server-side.
      if (err?.response?.status === 401) {
        window.location.href = "/signin";
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  loadProfile();
}, []);

  if (loading) {
    return (
      <div className="p-8">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        Unable to load your profile right now. Please refresh the page or try again shortly.
      </div>
    );
  }
const handleSave = async () => {
  await updateProfile(profile);

  setEditMode(false);

  toast.success("Profile updated successfully");
};

 return (
  <div className="max-w-6xl mx-auto px-6 py-8">

    <div className="flex items-center justify-between mb-8">
      <h1 className="text-4xl font-bold text-[#2F3E37]">
        My Profile
      </h1>

      <div className="flex gap-3">
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="
              bg-[#1E3A8A]
              hover:bg-[#182E6E]
              text-white
              px-5 py-2
              rounded-lg
              transition
            "
          >
            Edit Profile
          </button>
        ) : (
          <>
            <button
              onClick={handleSave}
              className="
                bg-green-600
                text-white
                px-5 py-2
                rounded-lg
              "
            >
              Save Changes
            </button>

            <button
              onClick={() => setEditMode(false)}
              className="
                bg-gray-300
                px-5 py-2
                rounded-lg
              "
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>

    <div className="grid lg:grid-cols-3 gap-6">

      {/* LEFT PROFILE CARD */}
      <div
        className="
          bg-white
          rounded-3xl
          shadow-lg
          p-8
          text-center
        "
      >
        <div
          className="
            w-28 h-28
            rounded-full
            bg-[#C89B3C]
            flex items-center justify-center
            text-4xl font-bold
            mx-auto
          "
        >
          {profile.first_name?.charAt(0)}
        </div>

        <h2 className="mt-4 text-2xl font-bold text-[#2F3E37]">
          {profile.first_name} {profile.last_name}
        </h2>

        <p className="text-gray-500 mt-2">
          {roleLabel}
        </p>

        <span
          className="
            inline-block
            mt-4
            px-4 py-2
            bg-green-100
            text-green-700
            rounded-full
            text-sm
          "
        >
          Active
        </span>

        {role === "PROVIDER" && (
          <Link
            href="/provider/dashboard"
            className="
              mt-4
              block
              text-sm
              font-medium
              text-[#5B756D]
              hover:underline
            "
          >
            Manage Business Profile →
          </Link>
        )}
      </div>

     {/* RIGHT DETAILS */}
<div className="lg:col-span-2 space-y-6">

  <div className="bg-white rounded-3xl shadow-lg p-8">
    <h3 className="text-xl font-semibold mb-6">
      Personal Information
    </h3>

    <div className="grid md:grid-cols-2 gap-6">

      {/* First Name */}
      <Field
        label="First Name"
        value={profile.first_name}
        editMode={editMode}
        onChange={(value) =>
          setProfile({
            ...profile,
            first_name: value,
          })
        }
      />

      {/* Last Name */}
      <Field
        label="Last Name"
        value={profile.last_name}
        editMode={editMode}
        onChange={(value) =>
          setProfile({
            ...profile,
            last_name: value,
          })
        }
      />

      {/* Email */}
      <Field
        label="Email"
        value={profile.email}
        editMode={false}
        onChange={() => {}}
      />

      {/* Phone */}
      <Field
        label="Phone"
        value={profile.phone}
        editMode={editMode}
        onChange={(value) =>
          setProfile({
            ...profile,
            phone: value,
          })
        }
      />

      {/* Address */}
      <Field
        label="Address"
        value={profile.address}
        editMode={editMode}
        onChange={(value) =>
          setProfile({
            ...profile,
            address: value,
          })
        }
      />

      {/* City */}
      <Field
        label="City"
        value={profile.city}
        editMode={editMode}
        onChange={(value) =>
          setProfile({
            ...profile,
            city: value,
          })
        }
      />

      {/* State */}
      <Field
        label="State"
        value={profile.state}
        editMode={editMode}
        onChange={(value) =>
          setProfile({
            ...profile,
            state: value,
          })
        }
      />

      {/* Country */}
      <Field
        label="Country"
        value={profile.country}
        editMode={editMode}
        onChange={(value) =>
          setProfile({
            ...profile,
            country: value,
          })
        }
      />

      {/* Pincode */}
      <Field
        label="Pincode"
        value={profile.pincode}
        editMode={editMode}
        onChange={(value) =>
          setProfile({
            ...profile,
            pincode: value,
          })
        }
      />
    </div>
  </div>

  {/* Bio */}
  <div className="bg-white rounded-3xl shadow-lg p-8">
    <h3 className="text-xl font-semibold mb-4">
      About Me
    </h3>

    {editMode ? (
      <textarea
        rows={5}
        value={profile.bio ?? ""}
        onChange={(e) =>
          setProfile({
            ...profile,
            bio: e.target.value,
          })
        }
        className="
          w-full
          border
          rounded-xl
          p-4
          focus:ring-2
          focus:ring-[#5B756D]
          outline-none
        "
      />
    ) : (
      <p className="text-gray-600">
        {profile.bio || "No bio added yet"}
      </p>
    )}
  </div>
</div>
    </div>
  </div>
);
}
function Field({
  label,
  value,
  editMode,
  onChange,
}: {
  label: string;
  value?: string;
  editMode: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-2">
        {label}
      </label>

      {editMode ? (
        <input
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="
            w-full
            border
            border-gray-300
            rounded-xl
            p-3
            focus:ring-2
            focus:ring-[#5B756D]
            outline-none
          "
        />
      ) : (
        <div
          className="
            bg-gray-50
            rounded-xl
            p-3
            min-h-[48px]
            flex items-center
          "
        >
          {value || "Not provided"}
        </div>
      )}
    </div>
  );
}
