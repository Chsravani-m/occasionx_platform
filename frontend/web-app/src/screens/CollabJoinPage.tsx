"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/context/NotificationContext";
import { getCurrentUser } from "@/utils/auth";
import { setActiveCollabSession } from "@/utils/collabSession";
import { previewCollabInvite, joinCollabSession } from "@/services/collabApi";

// No account required - a guest just needs a display name to join.
// If they happen to already be signed in, their user_id is attached
// too, but it's never required.
export function CollabJoinPage({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    session_id: string;
    host_name: string;
    title?: string | null;
    guest_name?: string | null;
    already_joined: boolean;
    session_closed: boolean;
  } | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await previewCollabInvite(token);
        setPreview(data);
        setDisplayName(currentUser?.fullName || data.guest_name || "");
      } catch (err) {
        console.error(err);
        setError("This invite link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleJoin = async () => {
    if (!displayName.trim()) {
      toast.error("Enter your name to join");
      return;
    }

    try {
      setJoining(true);
      const result = await joinCollabSession(
        token,
        displayName.trim(),
        currentUser?.id
      );
      setActiveCollabSession({
        sessionId: result.session_id,
        participantId: result.participant_id,
        displayName: displayName.trim(),
      });
      router.push(`/collab/${result.session_id}`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't join this session. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="max-w-md mx-auto p-8">Loading invite...</div>;
  }

  if (error || !preview) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h1 className="text-xl font-bold text-[#1F2937]">
          Invite not found
        </h1>
        <p className="mt-2 text-gray-600">{error}</p>
      </div>
    );
  }

  if (preview.session_closed) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h1 className="text-xl font-bold text-[#1F2937]">
          This session has ended
        </h1>
        <p className="mt-2 text-gray-600">
          {preview.host_name} has closed this planning session.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <div className="rounded-2xl bg-white border shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-[#1F2937]">
          {preview.host_name} invited you to plan together
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Join to pick services and chat about{" "}
          {preview.title || "the event"} - up to 4 people can be in this
          session.
        </p>

        <div className="mt-6 text-left">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Your name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-lg border p-2.5 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleJoin}
          disabled={joining}
          className="mt-5 w-full rounded-xl bg-[#1E3A8A] py-3 font-semibold text-white hover:bg-[#182E6E] transition disabled:opacity-60"
        >
          {joining
            ? "Joining..."
            : preview.already_joined
              ? "Rejoin Session"
              : "Join Session"}
        </button>
      </div>
    </div>
  );
}
