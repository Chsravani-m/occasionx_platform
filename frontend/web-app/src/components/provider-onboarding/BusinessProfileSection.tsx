"use client";
import { API_GATEWAY_URL } from "@/lib/apiClient";

import { useEffect, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";
import {
  getStates,
  getDistricts,
  getLocations,
} from "@/services/locationApi";
import {
  getProviderProfile,
  updateProviderProfile,
  uploadDisplayPicture
} from "@/services/providerProfileApi";

const PROVIDER_MEDIA_BASE = API_GATEWAY_URL;

interface State {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

export default function ProviderProfilePage() {
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [loading, setLoading] =
    useState(false);
  const [stateName, setStateName] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [displayPictureUrl, setDisplayPictureUrl] =
    useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);
  const [profile, setProfile] =
    useState({
      business_name: "",
      owner_name: "",
      email: "",
      phone: "",
      state_id: "",
      district_id: "",
      location_id: "",

      address: "",
      gst_number: "",
      description: "",
      verification_status: ""
    });

    
  useEffect(() => {
  const loadProfile = async () => {
    try {
      const providerId =
        localStorage.getItem("provider_id");

      console.log(
        "provider_id",
        providerId
      );

      if (!providerId) return;

      const data =
        await getProviderProfile(
          providerId
        );

      console.log(
        "PROFILE DATA",
        data
      );

      setProfile({
        business_name:
          data.business_name ?? "",

        owner_name:
          data.owner_name ?? "",

        email:
          data.email ?? "",

        phone:
          data.phone ?? "",

        state_id:
          String(data.state_id ?? ""),

        district_id:
          String(data.district_id ?? ""),

        location_id:
          String(data.location_id ?? ""),

        address:
          data.address ?? "",

        gst_number:
          data.gst_number ?? "",

        description:
          data.description ?? "",

        verification_status:
          data.verification_status ?? "",
      });

      setDisplayPictureUrl(
        data.display_picture_url ?? null
      );

      if (data.state_id) {
        const states =
          await getStates();

        const state =
          states.find(
            (s: State) =>
              s.id === data.state_id
          );

        setStateName(
          state?.name ?? ""
        );
      }

      if (data.state_id &&
          data.district_id) {

        const districts =
          await getDistricts(
            data.state_id
          );

        const district =
          districts.find(
            (d: District) =>
              d.id === data.district_id
          );

        setDistrictName(
          district?.name ?? ""
        );
      }

      if (data.district_id &&
          data.location_id) {

        const locations =
          await getLocations(
            data.district_id
          );

        const location =
          locations.find(
            (l: Location) =>
              l.id === data.location_id
          );

        setLocationName(
          location?.name ?? ""
        );
      }

    } catch (error) {
      console.error(error);
    }
  };

  void loadProfile();
}, []);

  const handlePhotoSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file = e.target.files?.[0];

    if (!file) return;

    const providerId =
      localStorage.getItem(
        "provider_id"
      );

    if (!providerId) return;

    try {

      setUploadingPhoto(true);

      const result =
        await uploadDisplayPicture(
          providerId,
          file
        );

      setDisplayPictureUrl(
        result.display_picture_url ?? null
      );

      toast.success(
        "Display picture updated"
      );

    } catch (error) {

      console.error(error);

      toast.error(
        "Failed to upload display picture"
      );

    } finally {

      setUploadingPhoto(false);

      e.target.value = "";
    }
  };

  const handleSave = async () => {

    const providerId =
      localStorage.getItem(
        "provider_id"
      );

    if (!providerId) return;

    try {

      setLoading(true);

      await updateProviderProfile(
        providerId,
        profile
      );

      toast.success(
        "Profile updated successfully"
      );

    } catch (error) {

      console.error(error);

      toast.error(
        "Failed to update profile"
      );

    } finally {

      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">

      <h1 className="text-4xl font-bold text-[#1F2937]">
        Business Profile
      </h1>

      <p className="text-gray-500 mt-2">
        Manage your business information.
      </p>

      <div className="bg-white rounded-3xl shadow mt-8 p-8">

        <div className="flex items-center gap-6 mb-8">

          <div
            className="
              w-24 h-24
              rounded-full
              overflow-hidden
              bg-gray-100
              border
              flex
              items-center
              justify-center
              flex-shrink-0
            "
          >
            {displayPictureUrl ? (
              <img
                src={`${PROVIDER_MEDIA_BASE}${displayPictureUrl}`}
                alt="Display picture"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl">🏢</span>
            )}
          </div>

          <div>
            <p className="font-semibold text-[#1F2937]">
              Display Picture
            </p>

            <p className="text-gray-500 text-sm mt-1">
              Shown on your provider card and details page. JPG, PNG, WEBP • Max 10 MB.
            </p>

            <label
              className="
                inline-block
                mt-3
                cursor-pointer
                bg-gray-100
                hover:bg-gray-200
                text-[#1E3A8A]
                font-medium
                text-sm
                rounded-xl
                px-4
                py-2
              "
            >
              {uploadingPhoto
                ? "Uploading..."
                : "Upload Photo"}

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handlePhotoSelected}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>
          </div>

        </div>

        <div className="grid md:grid-cols-2 gap-6">

        <input
          value={profile.business_name}
          onChange={(e) =>
            setProfile({
              ...profile,
              business_name:
                e.target.value,
            })
          }
          placeholder="Business Name"
          className="border rounded-xl p-4"
        />

        <input
          value={profile.owner_name}
          onChange={(e) =>
            setProfile({
              ...profile,
              owner_name:
                e.target.value,
            })
          }
          placeholder="Owner Name"
          className="border rounded-xl p-4"
        />

        <input
          value={profile.email}
          disabled
          className="
            border
            rounded-xl
            p-4
            bg-gray-100
            text-gray-600
            cursor-not-allowed
          "
        />

        <input
          value={profile.phone}
          onChange={(e) =>
            setProfile({
              ...profile,
              phone:
                e.target.value,
            })
          }
          placeholder="Phone Number"
          className="border rounded-xl p-4"
        />

        <input
          value={stateName}
          disabled
          placeholder="State"
          className="
            border
            rounded-xl
            p-4
            bg-gray-100
            text-gray-600
          "
        />

        <input
          value={districtName}
          disabled
          placeholder="District"
          className="
            border
            rounded-xl
            p-4
            bg-gray-100
            text-gray-600
          "
        />

        <input
          value={locationName}
          disabled
          placeholder="Location"
          className="
            md:col-span-2
            border
            rounded-xl
            p-4
            bg-gray-100
            text-gray-600
          "
        />

      </div>

        <textarea
          value={profile.address}
          onChange={(e) =>
            setProfile({
              ...profile,
              address:
                e.target.value
            })
          }
          placeholder="Business Address"
          rows={3}
          className="
            w-full
            border
            rounded-xl
            p-4
            mt-6
          "
        />

        
        <textarea
          value={profile.description}
          onChange={(e) =>
            setProfile({
              ...profile,
              description:
                e.target.value
            })
          }
          placeholder="Business Description"
          rows={5}
          className="
            w-full
            border
            rounded-xl
            p-4
            mt-6
          "
        />

        <button
          onClick={handleSave}
          disabled={loading}
          className="
            mt-8
            w-full
            bg-[#1E3A8A]
            hover:bg-[#182E6E]
            text-white
            rounded-xl
            py-4
            font-semibold
          "
        >
          {loading
            ? "Saving..."
            : "Save Profile"}
        </button>

      </div>

    </div>
  );
}