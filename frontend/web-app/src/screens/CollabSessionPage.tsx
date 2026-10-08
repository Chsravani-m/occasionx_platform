"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Send,
  Mail,
  MessageCircle,
  Copy,
  MonitorUp,
  MonitorX,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

import { useToast } from "@/context/NotificationContext";
import { getCurrentUser } from "@/utils/auth";
import {
  getActiveCollabSession,
  setActiveCollabSession,
} from "@/utils/collabSession";
import {
  getCollabSession,
  sendCollabInvite,
  sendCollabMessage,
  closeCollabSession,
  getCollabSignals,
  type CollabSessionState,
} from "@/services/collabApi";
import { GuestScreenShareManager } from "@/utils/webrtc";
import { useScreenShare } from "@/context/ScreenShareContext";

// Polling interval for the shared "screen" - keeps participants, the
// selected-services list, and chat roughly in sync without needing a
// websocket server. 4s is a reasonable trade-off between feeling live
// and not hammering the gateway for a feature capped at 4 people.
const POLL_INTERVAL_MS = 4000;

// Faster poll used only while a live screen share is being set up or
// active - WebRTC's SDP/ICE handshake is latency-sensitive, so this
// runs quicker than the main session poll but only when it matters.
const SIGNAL_POLL_INTERVAL_MS = 1500;

export function CollabSessionPage({ sessionId }: { sessionId: string }) {
  const toast = useToast();
  const currentUser = getCurrentUser();
  const searchParams = useSearchParams();

  // Lets the mobile app's in-app WebView "viewer" load straight into
  // this session as a participant it already knows about (from its
  // own AsyncStorage), without needing this browser context to share
  // localStorage with anything - a fresh WebView otherwise has no way
  // to know who it is. compact=1 strips the invite/chat/participants
  // chrome down to just the live screen-share video, since that's all
  // the mobile embed needs.
  const viewerParticipantId = searchParams.get("participant");
  const viewerName = searchParams.get("name");
  const compact = searchParams.get("compact") === "1";

  const [session, setSession] = useState<CollabSessionState | null>(null);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notMine, setNotMine] = useState(false);

  const [inviteContact, setInviteContact] = useState("");
  const [inviteChannel, setInviteChannel] = useState<"EMAIL" | "WHATSAPP">(
    "EMAIL"
  );
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Live screen sharing (web only) - see utils/webrtc.ts for the
  // actual WebRTC handshake. The host side's manager/MediaStream/poll
  // loops live in ScreenShareContext (mounted once at the root
  // layout), not here - this page unmounts on every route change, and
  // the whole point of "screen sharing" is that it keeps running while
  // the host browses elsewhere in OccasionX. sharingActiveForHost also
  // falls back to the polled session state in case the host reloaded
  // mid-share (this tab's context state is gone, but the toggle still
  // needs to work).
  const screenShare = useScreenShare();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [viewerConnecting, setViewerConnecting] = useState(false);
  // Participants/chat sidebar next to the video while a share is
  // live - hideable so the video can take the full width.
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const guestManagerRef = useRef<GuestScreenShareManager | null>(null);
  const signalsSinceRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getCollabSession(sessionId);
      setSession(data);
    } catch (err) {
      console.error(err);
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getCollabSession(sessionId);
        if (cancelled) return;
        setSession(data);

        if (viewerParticipantId) {
          setActiveCollabSession({
            sessionId: data.id,
            participantId: viewerParticipantId,
            displayName: viewerName || "Guest",
          });
          setMyParticipantId(viewerParticipantId);
        } else {
          const active = getActiveCollabSession();

          if (active?.sessionId === sessionId) {
            setMyParticipantId(active.participantId);
          } else if (currentUser?.id === data.host_user_id) {
            const host = data.participants.find((p) => p.role === "HOST");
            if (host) {
              setActiveCollabSession({
                sessionId: data.id,
                participantId: host.id,
                displayName: host.display_name,
              });
              setMyParticipantId(host.id);
            }
          } else {
            setNotMine(true);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Couldn't load this session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length]);

  const isHostParticipant = myParticipantId
    ? session?.participants.find((p) => p.id === myParticipantId)?.role ===
      "HOST"
    : false;

  const sharingActiveForHost =
    (screenShare.isSharing && screenShare.sessionId === session?.id) ||
    Boolean(
      isHostParticipant &&
        session?.is_screen_sharing &&
        session?.sharing_participant_id === myParticipantId
    );

  const watchingHostShare = Boolean(
    !isHostParticipant &&
      session?.is_screen_sharing &&
      session?.sharing_participant_id &&
      session.sharing_participant_id !== myParticipantId
  );

  // Guest side: notice when the host starts/stops sharing and
  // connect/disconnect accordingly.
  useEffect(() => {
    if (!session || !myParticipantId || isHostParticipant) return;

    if (watchingHostShare && session.sharing_participant_id) {
      if (!guestManagerRef.current) {
        signalsSinceRef.current = null;
        setViewerConnecting(true);
        const hostId = session.sharing_participant_id;
        const mgr = new GuestScreenShareManager(
          session.id,
          myParticipantId,
          hostId,
          (stream) => {
            setRemoteStream(stream);
            setViewerConnecting(!stream);
          }
        );
        guestManagerRef.current = mgr;
        mgr.requestOffer().catch((err) => console.error(err));
      }
    } else if (guestManagerRef.current) {
      guestManagerRef.current.stop();
      guestManagerRef.current = null;
      setRemoteStream(null);
      setViewerConnecting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchingHostShare,
    session?.sharing_participant_id,
    myParticipantId,
    isHostParticipant,
  ]);

  // Guest-side fast signaling poll (offers/ICE from the host) - only
  // runs while watching a live share. The host-side equivalent lives
  // in ScreenShareContext now, so it survives the host navigating
  // away from this page.
  useEffect(() => {
    if (!watchingHostShare || !session || !myParticipantId) return;

    let cancelled = false;
    // setInterval doesn't wait for the previous poll() to finish - if
    // one run is still awaiting handleSignal (e.g. ICE gathering is
    // slow) when the next tick fires, both runs would re-fetch and
    // re-apply the same not-yet-acknowledged OFFER, which throws
    // "Called in wrong state: stable" on the second setLocalDescription.
    // inFlight blocks that overlap; the processedIds set is a second,
    // cheap line of defense against re-applying a signal twice.
    let inFlight = false;
    const processedIds = new Set<string>();

    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const signals = await getCollabSignals(
          session.id,
          myParticipantId,
          signalsSinceRef.current ?? undefined
        );
        for (const signal of signals) {
          if (cancelled) return;
          if (processedIds.has(signal.id)) continue;
          processedIds.add(signal.id);
          await guestManagerRef.current?.handleSignal(signal);
          signalsSinceRef.current = signal.created_at;
        }
      } catch (err) {
        console.error(err);
      } finally {
        inFlight = false;
      }
    };

    poll();
    const interval = setInterval(poll, SIGNAL_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [watchingHostShare, session?.id, myParticipantId]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStream;
    // Some browsers don't honor the autoPlay attribute when srcObject
    // is assigned programmatically after mount - without this, the
    // video element just sits black even though frames are arriving.
    if (remoteStream) {
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Host's own local preview - bound to the MediaStream living in
  // ScreenShareContext (only when it's this session being shared).
  useEffect(() => {
    if (!localVideoRef.current) return;
    const stream =
      screenShare.isSharing && screenShare.sessionId === session?.id
        ? screenShare.stream
        : null;
    localVideoRef.current.srcObject = stream;
    if (stream) {
      localVideoRef.current.play().catch(() => {});
    }
  }, [screenShare.stream, screenShare.isSharing, screenShare.sessionId, session?.id]);

  // Tear down the guest-side WebRTC connection on unmount (navigating
  // away, closing the tab, etc). The host-side manager lives in
  // ScreenShareContext, mounted at the root layout - it's deliberately
  // NOT stopped here, so sharing keeps running while the host browses
  // elsewhere in OccasionX.
  useEffect(() => {
    return () => {
      guestManagerRef.current?.stop();
    };
  }, []);

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8">Loading session...</div>;
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-[#1F2937]">
          Session not found
        </h1>
        <p className="mt-2 text-gray-600">
          This planning session may have been closed or the link is
          incorrect.
        </p>
      </div>
    );
  }

  const isHost = myParticipantId
    ? session.participants.find((p) => p.id === myParticipantId)?.role ===
      "HOST"
    : false;

  const guestSlotsUsed = session.participants.filter(
    (p) => p.role === "GUEST"
  ).length;
  const guestSlotsLeft = Math.max(0, session.max_guests - guestSlotsUsed);

  const handleInvite = async () => {
    if (!currentUser?.id) return;

    if (!inviteContact.trim()) {
      toast.error(
        inviteChannel === "EMAIL"
          ? "Enter an email address"
          : "Enter a WhatsApp number"
      );
      return;
    }

    try {
      setInviting(true);
      const result = await sendCollabInvite(
        session.id,
        currentUser.id,
        inviteContact.trim(),
        inviteChannel,
        inviteName.trim() || undefined
      );
      setLastInviteLink(result.invite_link);
      toast.success(
        result.delivered
          ? `Invite sent via ${inviteChannel === "EMAIL" ? "email" : "WhatsApp"}`
          : "Invite created - delivery isn't configured yet, so share the link below manually"
      );
      setInviteContact("");
      setInviteName("");
      refresh();
    } catch (err: unknown) {
      console.error(err);
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response
          ?.data?.detail || "Couldn't send invite. Please try again.";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  };

  const handleSendChat = async () => {
    if (!myParticipantId || !chatInput.trim()) return;

    try {
      setSendingChat(true);
      await sendCollabMessage(session.id, myParticipantId, chatInput.trim());
      setChatInput("");
      refresh();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't send that message.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleStartShare = async () => {
    if (!currentUser?.id || !myParticipantId || !session) return;

    try {
      const started = await screenShare.startShare(
        session.id,
        currentUser.id,
        myParticipantId
      );
      if (started) {
        refresh();
        toast.success("Sharing your screen with the group");
      }
      // started === false means the user cancelled the browser's
      // "choose what to share" prompt - not an error, no toast.
    } catch (err) {
      console.error(err);
      toast.error("Couldn't start screen sharing. Please try again.");
    }
  };

  const handleStopShare = async () => {
    await screenShare.stopShare(session?.id, currentUser?.id);
    refresh();
  };

  const handleCloseSession = async () => {
    if (!currentUser?.id || !session) return;
    try {
      if (sharingActiveForHost) {
        await screenShare.stopShare(session.id, currentUser.id);
      }
      await closeCollabSession(session.id, currentUser.id);
      refresh();
      toast.success("Session closed");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't close the session.");
    }
  };

  if (notMine) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold text-[#1F2937]">
          Open this from your invite link
        </h1>
        <p className="mt-2 text-gray-600">
          This session isn&apos;t linked to this browser. Use the join
          link that was emailed or sent to you on WhatsApp.
        </p>
      </div>
    );
  }

  // Minimal view for the mobile app's embedded WebView - just the live
  // screen-share video, no invite form/chat/participants chrome (the
  // native screens already show those).
  if (compact) {
    return (
      <div className="p-3">
        {watchingHostShare ? (
          <div className="rounded-xl bg-[#0F172A] p-2">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-lg bg-black"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-300 py-16 justify-center">
                <Loader2 size={16} className="animate-spin" />
                {viewerConnecting
                  ? "Connecting to host's screen..."
                  : "Waiting for host..."}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-400 py-16">
            {session.host_name} isn&apos;t sharing their screen right now.
          </div>
        )}
      </div>
    );
  }

  const sharingActive = sharingActiveForHost || watchingHostShare;

  const participantsCard = (
    <div className="rounded-2xl bg-white border shadow-sm p-5">
      <div className="flex items-center gap-2 text-[#1F2937] font-semibold">
        <Users size={18} />
        Participants ({session.participants.length})
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {session.participants.map((p) => (
          <span
            key={p.id}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              p.role === "HOST"
                ? "bg-[#1E3A8A] text-white"
                : p.joined_at
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            {p.display_name}
            {p.role === "HOST" ? " (Host)" : p.joined_at ? "" : " (Invited)"}
          </span>
        ))}
      </div>

      {isHost && session.status === "ACTIVE" && (
        <div className="mt-4 border-t pt-4">
          <p className="text-sm font-medium text-[#1F2937]">
            Invite up to {session.max_guests} people
            {guestSlotsLeft > 0
              ? ` (${guestSlotsLeft} slot${guestSlotsLeft === 1 ? "" : "s"} left)`
              : " (all slots used)"}
          </p>

          {guestSlotsLeft > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={inviteChannel}
                onChange={(e) =>
                  setInviteChannel(e.target.value as "EMAIL" | "WHATSAPP")
                }
                className="rounded-lg border p-2 text-sm"
              >
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>

              <input
                type="text"
                placeholder="Name (optional)"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="rounded-lg border p-2 text-sm w-40"
              />

              <input
                type="text"
                placeholder={
                  inviteChannel === "EMAIL"
                    ? "friend@example.com"
                    : "10-digit phone number"
                }
                value={inviteContact}
                onChange={(e) => setInviteContact(e.target.value)}
                className="rounded-lg border p-2 text-sm flex-1 min-w-[180px]"
              />

              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting}
                className="flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#182E6E] transition disabled:opacity-60"
              >
                {inviteChannel === "EMAIL" ? (
                  <Mail size={14} />
                ) : (
                  <MessageCircle size={14} />
                )}
                {inviting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          )}

          {lastInviteLink && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
              <span className="truncate flex-1">{lastInviteLink}</span>
              <button
                type="button"
                onClick={() => handleCopyLink(lastInviteLink)}
                className="flex items-center gap-1 text-[#1E3A8A] font-medium"
              >
                <Copy size={12} /> Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const chatCard = (
    <div className="rounded-2xl bg-white border shadow-sm p-5">
      <h2 className="font-semibold text-[#1F2937]">Group Chat</h2>

      <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
        {session.messages.length === 0 && (
          <p className="text-sm text-gray-400">
            No messages yet - say hello!
          </p>
        )}

        {session.messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-semibold text-[#1E3A8A]">
              {m.sender_name}:
            </span>{" "}
            <span className="text-gray-700">{m.message}</span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {session.status === "ACTIVE" && myParticipantId && (
        <div className="mt-4 flex items-center gap-2 border-t pt-4">
          <input
            type="text"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendChat();
            }}
            className="flex-1 rounded-lg border p-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSendChat}
            disabled={sendingChat}
            className="rounded-lg bg-[#1E3A8A] p-2.5 text-white hover:bg-[#182E6E] transition disabled:opacity-60"
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );

  const videoPanel = sharingActiveForHost ? (
    <div className="rounded-2xl bg-[#0F172A] border shadow-sm p-4 h-full">
      <p className="text-xs font-medium text-gray-300 mb-2">
        You&apos;re sharing your screen with the group
      </p>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="w-full rounded-lg bg-black h-[calc(100%-24px)] min-h-[300px] object-contain"
      />
    </div>
  ) : (
    <div className="rounded-2xl bg-[#0F172A] border shadow-sm p-4 h-full">
      <p className="text-xs font-medium text-gray-300 mb-2">
        {session.host_name}&apos;s screen
      </p>
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-lg bg-black h-[calc(100%-24px)] min-h-[300px] object-contain"
        />
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-300 py-10 justify-center">
          <Loader2 size={16} className="animate-spin" />
          {viewerConnecting ? "Connecting to host's screen..." : "Waiting for host..."}
        </div>
      )}
    </div>
  );

  return (
    <div className={`mx-auto p-6 md:p-8 ${sharingActive ? "max-w-7xl" : "max-w-4xl"}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1F2937]">
            {session.title || "Plan Together"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Hosted by {session.host_name} &middot;{" "}
            {session.status === "ACTIVE" ? "Active" : "Closed"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sharingActive && (
            <button
              type="button"
              onClick={() => setSidebarVisible((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 transition"
            >
              {sidebarVisible ? (
                <PanelRightClose size={14} />
              ) : (
                <PanelRightOpen size={14} />
              )}
              {sidebarVisible ? "Hide" : "Show"} participants &amp; chat
            </button>
          )}

          {isHost && session.status === "ACTIVE" && (
            <>
              <button
                type="button"
                onClick={sharingActiveForHost ? handleStopShare : handleStartShare}
                disabled={screenShare.starting}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                  sharingActiveForHost
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-[#1E3A8A] text-white hover:bg-[#182E6E]"
                }`}
              >
                {screenShare.starting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : sharingActiveForHost ? (
                  <MonitorX size={14} />
                ) : (
                  <MonitorUp size={14} />
                )}
                {screenShare.starting
                  ? "Starting..."
                  : sharingActiveForHost
                    ? "Stop Sharing"
                    : "Share My Screen"}
              </button>
              <button
                type="button"
                onClick={handleCloseSession}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-red-400 hover:text-red-600 transition"
              >
                Close Session
              </button>
            </>
          )}
        </div>
      </div>

      {sharingActive ? (
        <div className="mt-6 flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="flex-1 min-w-0 lg:min-h-[70vh]">{videoPanel}</div>

          {sidebarVisible && (
            <div className="w-full lg:w-96 shrink-0 space-y-6">
              {participantsCard}
              {chatCard}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {participantsCard}
          {chatCard}
        </div>
      )}
    </div>
  );
}
