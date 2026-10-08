"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import {
  getCollabSession,
  getCollabSignals,
  startScreenShare as apiStartScreenShare,
  stopScreenShare as apiStopScreenShare,
} from "@/services/collabApi";
import { HostScreenShareManager } from "@/utils/webrtc";

// Live screen mirroring's WebRTC lifecycle (the MediaStream, the
// per-guest RTCPeerConnections, the signaling poll) is mounted here at
// the root layout - deliberately NOT inside CollabSessionPage. The
// host is expected to be able to browse the rest of OccasionX (add
// another provider, look something up) while still sharing, like
// screen sharing in Teams/Zoom. CollabSessionPage unmounts on every
// route change, so anything scoped to it would die the moment the
// host navigated away; this provider is mounted once for the whole
// app and survives navigation, so the share keeps running - and
// whatever the host does on screen while it's live (including
// browsing OccasionX itself) is exactly what the guest continues to
// see, same as real screen sharing.
const GUEST_POLL_INTERVAL_MS = 4000;
const SIGNAL_POLL_INTERVAL_MS = 1500;

interface ScreenShareContextValue {
  sessionId: string | null;
  isSharing: boolean;
  starting: boolean;
  guestCount: number;
  stream: MediaStream | null;
  /** Resolves true if sharing actually started, false if the user
   * cancelled the browser's "choose what to share" prompt (not an
   * error - callers shouldn't show a toast for that case). Throws for
   * real failures after the prompt was accepted. */
  startShare: (
    sessionId: string,
    hostUserId: string,
    hostParticipantId: string
  ) => Promise<boolean>;
  /** fallbackSessionId/fallbackHostUserId are used when this provider
   * never actually started the share itself - e.g. the page reloaded
   * while the backend still had is_screen_sharing=true (the local
   * MediaStream can't survive a reload, but the flag can go stale).
   * Without a fallback, stopShare would have no sessionId/hostUserId
   * to call the backend with and the flag would stay stuck forever. */
  stopShare: (
    fallbackSessionId?: string,
    fallbackHostUserId?: string
  ) => Promise<void>;
}

const ScreenShareContext = createContext<ScreenShareContextValue | null>(null);

export function ScreenShareProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const managerRef = useRef<HostScreenShareManager | null>(null);
  const signalsSinceRef = useRef<string | null>(null);
  const hostUserIdRef = useRef<string | null>(null);
  const hostParticipantIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const stopShare = useCallback(async (fallbackSessionId?: string, fallbackHostUserId?: string) => {
    managerRef.current?.stop();
    managerRef.current = null;

    const sid = sessionIdRef.current ?? fallbackSessionId ?? null;
    const huid = hostUserIdRef.current ?? fallbackHostUserId ?? null;

    sessionIdRef.current = null;
    hostUserIdRef.current = null;
    hostParticipantIdRef.current = null;
    signalsSinceRef.current = null;

    setIsSharing(false);
    setStarting(false);
    setSessionId(null);
    setGuestCount(0);
    setStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });

    if (sid && huid) {
      try {
        await apiStopScreenShare(sid, huid);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const startShare = useCallback(
    async (sid: string, hostUserId: string, hostParticipantId: string) => {
      let displayStream: MediaStream;
      try {
        setStarting(true);
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } catch (err) {
        console.error(err);
        setStarting(false);
        return false; // user cancelled the share picker
      }

      try {
        const mgr = new HostScreenShareManager(sid, hostParticipantId, displayStream);
        managerRef.current = mgr;
        signalsSinceRef.current = null;
        hostUserIdRef.current = hostUserId;
        hostParticipantIdRef.current = hostParticipantId;
        sessionIdRef.current = sid;

        // Covers the browser's own "Stop sharing" bar/button too, not
        // just our in-app one.
        displayStream.getVideoTracks()[0]?.addEventListener("ended", () => {
          stopShare();
        });

        await apiStartScreenShare(sid, hostUserId);

        setSessionId(sid);
        setStream(displayStream);
        setIsSharing(true);

        try {
          const session = await getCollabSession(sid);
          session.participants
            .filter((p) => p.role === "GUEST" && p.joined_at)
            .forEach((p) => mgr.connectToGuest(p.id).catch((e) => console.error(e)));
          setGuestCount(mgr.connectedGuestIds().length);
        } catch (err) {
          console.error(err);
        }

        return true;
      } catch (err) {
        console.error(err);
        displayStream.getTracks().forEach((t) => t.stop());
        managerRef.current = null;
        sessionIdRef.current = null;
        hostUserIdRef.current = null;
        hostParticipantIdRef.current = null;
        throw err;
      } finally {
        setStarting(false);
      }
    },
    [stopShare]
  );

  // Keep connecting any guest who joins after sharing started, and
  // notice if sharing was stopped from elsewhere (another tab/device)
  // - runs for as long as sharing is active, regardless of which
  // OccasionX page is currently rendered.
  useEffect(() => {
    if (!isSharing || !sessionId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const session = await getCollabSession(sessionId);
        if (cancelled) return;
        if (!session.is_screen_sharing) {
          stopShare();
          return;
        }
        const mgr = managerRef.current;
        if (!mgr) return;
        const connected = new Set(mgr.connectedGuestIds());
        session.participants.forEach((p) => {
          if (p.role === "GUEST" && p.joined_at && !connected.has(p.id)) {
            mgr.connectToGuest(p.id).catch((err) => console.error(err));
          }
        });
        setGuestCount(mgr.connectedGuestIds().length);
      } catch (err) {
        console.error(err);
      }
    };

    const interval = setInterval(poll, GUEST_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isSharing, sessionId, stopShare]);

  // WebRTC signaling poll (offers/answers/ICE) - same in-flight guard
  // + dedup as the original CollabSessionPage version, just hoisted so
  // it keeps running across route changes.
  useEffect(() => {
    if (!isSharing || !sessionId) return;
    const myParticipantId = hostParticipantIdRef.current;
    if (!myParticipantId) return;

    let cancelled = false;
    let inFlight = false;
    const processedIds = new Set<string>();

    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const signals = await getCollabSignals(
          sessionId,
          myParticipantId,
          signalsSinceRef.current ?? undefined
        );
        for (const signal of signals) {
          if (cancelled) return;
          if (processedIds.has(signal.id)) continue;
          processedIds.add(signal.id);
          await managerRef.current?.handleSignal(signal);
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
  }, [isSharing, sessionId]);

  // Actually closing/refreshing the tab - stop the local tracks so the
  // browser's capture indicator/mic-style dot clears immediately. The
  // backend's is_screen_sharing flag is best-effort here (no time for
  // a network round trip during unload); the guest poll loop above
  // will otherwise catch a stale flag next time it's checked.
  useEffect(() => {
    const handler = () => {
      managerRef.current?.stop();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return (
    <ScreenShareContext.Provider
      value={{ sessionId, isSharing, starting, guestCount, stream, startShare, stopShare }}
    >
      {children}

      {isSharing && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-[#0F172A] text-white pl-4 pr-2 py-2 shadow-lg text-sm">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Sharing your screen
            {guestCount > 0 ? ` · ${guestCount} watching` : ""}
          </span>
          {sessionId && (
            <Link
              href={`/collab/${sessionId}`}
              className="text-xs font-medium underline underline-offset-2 hover:text-gray-200 whitespace-nowrap"
            >
              View session
            </Link>
          )}
          <button
            type="button"
            onClick={() => stopShare()}
            className="rounded-full bg-red-600 hover:bg-red-700 px-3 py-1 text-xs font-semibold transition whitespace-nowrap"
          >
            Stop
          </button>
        </div>
      )}
    </ScreenShareContext.Provider>
  );
}

export function useScreenShare() {
  const ctx = useContext(ScreenShareContext);
  if (!ctx) {
    throw new Error("useScreenShare must be used within a ScreenShareProvider");
  }
  return ctx;
}
