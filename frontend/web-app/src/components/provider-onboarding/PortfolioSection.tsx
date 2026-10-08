"use client";
import { API_GATEWAY_URL } from "@/lib/apiClient";

import { useEffect, useState } from "react";
import { useToast, useConfirm } from "@/context/NotificationContext";

import {
  uploadPortfolio,
  getPortfolio,
  deletePortfolio
} from "@/services/providerPortfolioApi";

import {
  getProviderProfile,
  uploadCoverImage
} from "@/services/providerProfileApi";

const PROVIDER_MEDIA_BASE = API_GATEWAY_URL;

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  media_type: "IMAGE" | "VIDEO" | "ZIP";
  media_url: string;
}

export default function ProviderPortfolioPage() {
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [portfolio, setPortfolio] =
    useState<PortfolioItem[]>([]);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [activeTab, setActiveTab] =
  useState<
    "IMAGE" |
    "VIDEO" |
    "ZIP"
  >("IMAGE");
const [error, setError] =
  useState("");

const imageCount =
  portfolio.filter(
    p => p.media_type === "IMAGE"
  ).length;

const videoCount =
  portfolio.filter(
    p => p.media_type === "VIDEO"
  ).length;

const albumCount =
  portfolio.filter(
    p => p.media_type === "ZIP"
  ).length;

  const filteredPortfolio =
  portfolio.filter(
    (item) =>
      item.media_type ===
      activeTab
  );
  const [loading, setLoading] =
    useState(false);

  const [coverImageUrl, setCoverImageUrl] =
    useState<string | null>(null);

  const [uploadingCover, setUploadingCover] =
    useState(false);


  const validateFile = (
  file: File,
  type: "IMAGE" | "VIDEO" | "ZIP"
): string | null => {

  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ];

  const videoTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ];

  const zipTypes = [
    "application/zip",
    "application/x-zip-compressed"
  ];

  const MAX_IMAGE_SIZE =
    10 * 1024 * 1024;

  const MAX_VIDEO_SIZE =
    100 * 1024 * 1024;

  const MAX_ZIP_SIZE =
    250 * 1024 * 1024;

  if (type === "IMAGE") {

    if (
      !imageTypes.includes(
        file.type
      )
    ) {
      return "Only JPG, PNG, WEBP images are allowed.";
    }

    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {
      return "Image size must be less than 10 MB.";
    }
  }

  if (type === "VIDEO") {

    if (
      !videoTypes.includes(
        file.type
      )
    ) {
      return "Only MP4, WEBM, MOV videos are allowed.";
    }

    if (
      file.size >
      MAX_VIDEO_SIZE
    ) {
      return "Video size must be less than 100 MB.";
    }
  }

  if (type === "ZIP") {

    if (
      !zipTypes.includes(
        file.type
      ) &&
      !file.name
        .toLowerCase()
        .endsWith(".zip")
    ) {
      return "Only ZIP files are allowed.";
    }

    if (
      file.size >
      MAX_ZIP_SIZE
    ) {
      return "ZIP size must be less than 250 MB.";
    }
  }

  return null;
};

  const loadPortfolio = async () => {

    const providerId =
      localStorage.getItem(
        "provider_id"
      );

    if (!providerId) return;

    const data =
      await getPortfolio(
        providerId
      );

    setPortfolio(data);
  };

  const loadCoverImage = async () => {

    const providerId =
      localStorage.getItem(
        "provider_id"
      );

    if (!providerId) return;

    try {
      const profile = await getProviderProfile(providerId);
      setCoverImageUrl(profile.cover_image_url ?? null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadPortfolio();
    void loadCoverImage();
  }, []);

  const handleCoverSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validationError = validateFile(selected, "IMAGE");
    if (validationError) {
      toast.error(validationError);
      e.target.value = "";
      return;
    }

    const providerId =
      localStorage.getItem("provider_id");

    if (!providerId) return;

    try {
      setUploadingCover(true);

      const result = await uploadCoverImage(
        providerId,
        selected
      );

      setCoverImageUrl(result.cover_image_url ?? null);
      toast.success("Background photo updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload background photo");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };


  const handleUpload = async () => {

    if (!title.trim()) {
    setError(
      "Portfolio title is required"
    );
    return;
  }

  if (!file) {
    setError(
      "Please select a file"
    );
    return;
  }

    const validationError =
      validateFile(
        file,
        activeTab
      );

    if (validationError) {
      setError(validationError);
      return;
    }

    const providerId =
      localStorage.getItem(
        "provider_id"
      );

    if (!providerId) return;

    try {

      setLoading(true);

      await uploadPortfolio(
        providerId,
        title,
        description,
        file
      );

      setTitle("");
      setDescription("");
      setFile(null);

      await loadPortfolio();

      setError("");

    } catch (err) {

      console.error(err);

      setError(
        "Upload failed"
      );

    } finally {

      setLoading(false);
    }
  };

  const handleDelete = async (
    portfolioId: string
  ) => {

    if (
      !(await confirmDialog(
        "Delete portfolio item?"
      ))
    ) {
      return;
    }

    await deletePortfolio(
      portfolioId
    );

    await loadPortfolio();
  };

  return (
    <div className="max-w-7xl mx-auto p-8">

      <h1 className="text-4xl font-bold text-[#1F2937]">
        Portfolio Gallery
      </h1>

      <p className="text-gray-500 mt-2">
        Showcase your best work to customers.
      </p>

      {/* Background / Cover Photo */}

      <div
        className={`
          relative
          mt-8
          rounded-3xl
          overflow-hidden
          h-56
          border
          flex items-center justify-center
          ${
            coverImageUrl
              ? ""
              : "bg-gradient-to-r from-[#1E3A8A] to-[#18285A]"
          }
        `}
      >
        {coverImageUrl && (
          <img
            src={`${PROVIDER_MEDIA_BASE}${coverImageUrl}`}
            alt="Portfolio background"
            className="w-full h-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute bottom-4 left-6 text-white">
          <p className="font-semibold">Background Photo</p>
          <p className="text-white/80 text-sm">
            Shown at the top of your portfolio. JPG, PNG, WEBP • Max 10 MB.
          </p>
        </div>

        <label
          className="
            absolute
            bottom-4
            right-6
            cursor-pointer
            bg-white/90
            hover:bg-white
            text-[#1E3A8A]
            font-medium
            text-sm
            rounded-xl
            px-4 py-2
          "
        >
          {uploadingCover ? "Uploading..." : "Upload Background"}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleCoverSelected}
            disabled={uploadingCover}
            className="hidden"
          />
        </label>
      </div>

    <div className="grid md:grid-cols-3 gap-5 mt-8">

  <div className="bg-white rounded-3xl p-6 shadow">
    <p className="text-gray-500">
      Images
    </p>

    <h2 className="text-3xl font-bold">
      {imageCount}
    </h2>
  </div>

  <div className="bg-white rounded-3xl p-6 shadow">
    <p className="text-gray-500">
      Videos
    </p>

    <h2 className="text-3xl font-bold">
      {videoCount}
    </h2>
  </div>

  <div className="bg-white rounded-3xl p-6 shadow">
    <p className="text-gray-500">
      Albums
    </p>

    <h2 className="text-3xl font-bold">
      {albumCount}
    </h2>
  </div>

</div>
    <div className="flex gap-3 mt-8">

    <button
      onClick={() =>
        setActiveTab("IMAGE")
      }
      className={`
        px-5 py-2 rounded-xl
        ${
          activeTab === "IMAGE"
            ? "bg-[#1E3A8A] text-white"
            : "bg-gray-100"
        }
      `}
    >
      Images
    </button>

    <button
      onClick={() =>
        setActiveTab("VIDEO")
      }
      className={`
        px-5 py-2 rounded-xl
        ${
          activeTab === "VIDEO"
            ? "bg-[#1E3A8A] text-white"
            : "bg-gray-100"
        }
      `}
    >
      Videos
    </button>

    <button
      onClick={() =>
        setActiveTab("ZIP")
      }
      className={`
        px-5 py-2 rounded-xl
        ${
          activeTab === "ZIP"
            ? "bg-[#1E3A8A] text-white"
            : "bg-gray-100"
        }
      `}
    >
      Project Albums
    </button>

  </div>
      {/* Upload Card */}

      <div
        className="
          bg-white
          rounded-3xl
          shadow
          mt-8
          p-8
        "
      >
        <h2
          className="
            text-xl
            font-semibold
            mb-6
          "
        >
          Upload Portfolio
        </h2>

        <div className="space-y-4">

          <input
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            placeholder="Portfolio Title"
            className="
              w-full
              border
              rounded-xl
              p-4
            "
          />

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            placeholder="Description"
            rows={4}
            className="
              w-full
              border
              rounded-xl
              p-4
            "
          />

          <input
            type="file"
            accept={
            activeTab === "IMAGE"
              ? ".jpg,.jpeg,.png,.webp"
              : activeTab === "VIDEO"
              ? ".mp4,.webm,.mov"
              : ".zip"
          }
            onChange={(e) =>
              setFile(
                e.target.files?.[0] || null
              )
            }
            className="
              w-full
              border
              rounded-xl
              p-4
            "
          />
          <div className="text-sm text-gray-500">

            {activeTab === "IMAGE" && (
              <p>
                Allowed: JPG, PNG, WEBP • Max Size: 10 MB
              </p>
            )}

            {activeTab === "VIDEO" && (
              <p>
                Allowed: MP4, WEBM, MOV • Max Size: 100 MB
              </p>
            )}

            {activeTab === "ZIP" && (
              <p>
                Allowed: ZIP • Max Size: 250 MB
              </p>
            )}

          </div>
          {error && (
            <div
              className="
                bg-red-50
                border
                border-red-200
                text-red-600
                rounded-xl
                p-3
              "
            >
              {error}
            </div>
          )}
          <button
            onClick={handleUpload}
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
            ? "Uploading..."
            : activeTab === "IMAGE"
            ? "Upload Image"
            : activeTab === "VIDEO"
            ? "Upload Video"
            : "Upload Project Album"}
          </button>

        </div>
      </div>

      {/* Portfolio Grid */}

      <div className="mt-10">

        <h2
          className="
            text-2xl
            font-semibold
            mb-6
          "
        >
          My Portfolio
        </h2>

        {portfolio.length === 0 && (
          <div
          className="
            bg-white
            rounded-3xl
            p-16
            text-center
          "
        >
          <div className="text-6xl">
            📸
          </div>

          <h3 className="mt-4 text-xl font-semibold">
            No Portfolio Yet
          </h3>

          <p className="text-gray-500 mt-2">
            Upload your best work to
            attract more customers.
          </p>
        </div>
        )}
        <div
          className="
            grid
            md:grid-cols-3
            gap-6
          "
        >

          {filteredPortfolio.map((item) => (

            <div
              key={item.id}
              className="
                bg-white
                rounded-3xl
                shadow
                overflow-hidden
              "
            >

              {item.media_type ===
              "IMAGE" ? (

                <img
                  src={`${API_GATEWAY_URL}${item.media_url}`}
                  alt={item.title}
                  className="
                    w-full
                    h-56
                    object-cover
                  "
                />

              ) : item.media_type === "VIDEO" ? (

                <video
                  controls
                  className="
                    w-full
                    h-56
                    object-cover
                  "
                >
                  <source
                    src={`${API_GATEWAY_URL}${item.media_url}`}
                  />
                </video>

              ) : (
                <div
                  className="
                    h-56
                    flex
                    items-center
                    justify-center
                    bg-gray-100
                  "
                >
                  <div className="text-6xl">
                    📦
                  </div>
                </div>
              )}

              <div className="p-5">

                <h3
                  className="
                    font-semibold
                    text-lg
                  "
                >
                  {item.title}
                </h3>

                <p
                  className="
                    text-gray-500
                    mt-2
                    text-sm
                  "
                >
                  {item.description}
                </p>

                <button
                  onClick={() =>
                    handleDelete(
                      item.id
                    )
                  }
                  className="
                    mt-4
                    text-red-600
                    font-medium
                  "
                >
                  Delete
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}