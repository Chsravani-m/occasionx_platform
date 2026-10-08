import {
  sendCollabSignal,
  type CollabSignal,
  type CollabSignalType,
} from "@/services/collabApi";

// Live screen mirroring for "Plan Together" (web app only): the host's
// tab captures its own screen via getDisplayMedia and streams it
// directly (WebRTC, peer-to-peer) to each guest's tab. This backend
// never sees the video - only the SDP offer/answer + ICE candidates
// needed to set up each connection get relayed through
// /collab/sessions/{id}/signals, polled on a short interval by
// CollabSessionPage.

// Public STUN servers - enough to establish a direct connection in
// most cases (same wifi / most home networks). Some restrictive
// corporate/mobile networks would need a TURN relay too, which this
// doesn't set up; if a connection doesn't establish, that's the most
// likely reason.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function newPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

/** Host side: one RTCPeerConnection per connected guest, all fed from
 * the same local display-capture stream. */
export class HostScreenShareManager {
  private sessionId: string;
  private hostParticipantId: string;
  private stream: MediaStream;
  private connections = new Map<string, RTCPeerConnection>();

  constructor(sessionId: string, hostParticipantId: string, stream: MediaStream) {
    this.sessionId = sessionId;
    this.hostParticipantId = hostParticipantId;
    this.stream = stream;
  }

  /** Create (or recreate) a connection + offer for one guest. Safe to
   * call again for a guest who requests a fresh offer (e.g. after a
   * reload). */
  async connectToGuest(guestParticipantId: string) {
    this.connections.get(guestParticipantId)?.close();

    const pc = newPeerConnection();
    this.connections.set(guestParticipantId, pc);

    this.stream.getTracks().forEach((track) => pc.addTrack(track, this.stream));

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendCollabSignal(
        this.sessionId,
        this.hostParticipantId,
        guestParticipantId,
        "ICE_CANDIDATE",
        JSON.stringify(event.candidate.toJSON())
      ).catch(() => {});
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await sendCollabSignal(
      this.sessionId,
      this.hostParticipantId,
      guestParticipantId,
      "OFFER",
      JSON.stringify(offer)
    );
  }

  async handleSignal(signal: CollabSignal) {
    const pc = this.connections.get(signal.from_participant_id);

    if (signal.signal_type === "REQUEST_OFFER") {
      await this.connectToGuest(signal.from_participant_id);
      return;
    }

    if (!pc || !signal.payload) return;

    if (signal.signal_type === "ANSWER") {
      // Only "have-local-offer" is a safe state to apply an answer to -
      // a duplicate/late ANSWER after the connection is already
      // "stable" would throw here otherwise. See the matching guard in
      // GuestScreenShareManager.
      if (pc.signalingState !== "have-local-offer") return;
      const answer = JSON.parse(signal.payload) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);
    } else if (signal.signal_type === "ICE_CANDIDATE") {
      const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Candidate arriving before the remote description is applied
        // is expected sometimes with polling-based signaling - it's
        // safe to drop, more candidates keep coming until one lands.
      }
    }
  }

  /** Guests currently connected/being connected to. */
  connectedGuestIds(): string[] {
    return Array.from(this.connections.keys());
  }

  stop() {
    this.connections.forEach((pc) => pc.close());
    this.connections.clear();
    this.stream.getTracks().forEach((track) => track.stop());
  }
}

/** Guest side: a single connection to the host. */
export class GuestScreenShareManager {
  private sessionId: string;
  private myParticipantId: string;
  private hostParticipantId: string;
  private onStream: (stream: MediaStream | null) => void;
  private pc: RTCPeerConnection | null = null;

  constructor(
    sessionId: string,
    myParticipantId: string,
    hostParticipantId: string,
    onStream: (stream: MediaStream | null) => void
  ) {
    this.sessionId = sessionId;
    this.myParticipantId = myParticipantId;
    this.hostParticipantId = hostParticipantId;
    this.onStream = onStream;
  }

  /** Ask the host to (re)start the handshake - used on first seeing
   * is_screen_sharing=true, or if the host started sharing before we
   * joined/reloaded. */
  async requestOffer() {
    await sendCollabSignal(
      this.sessionId,
      this.myParticipantId,
      this.hostParticipantId,
      "REQUEST_OFFER"
    );
  }

  private ensurePeerConnection(): RTCPeerConnection {
    if (this.pc) return this.pc;

    const pc = newPeerConnection();
    this.pc = pc;

    pc.ontrack = (event) => {
      this.onStream(event.streams[0] ?? null);
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendCollabSignal(
        this.sessionId,
        this.myParticipantId,
        this.hostParticipantId,
        "ICE_CANDIDATE",
        JSON.stringify(event.candidate.toJSON())
      ).catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.onStream(null);
      }
    };

    return pc;
  }

  async handleSignal(signal: CollabSignal) {
    if (signal.from_participant_id !== this.hostParticipantId || !signal.payload) {
      return;
    }

    if (signal.signal_type === "OFFER") {
      const pc = this.ensurePeerConnection();

      // A second OFFER shouldn't normally arrive mid-negotiation, but
      // if one does (e.g. a duplicate slipping past the caller's own
      // dedup), setRemoteDescription would move the connection out of
      // "stable" and the subsequent setLocalDescription(answer) below
      // would throw "Called in wrong state" - only "stable" is a safe
      // state to receive a fresh offer in.
      if (pc.signalingState !== "stable") return;

      const offer = JSON.parse(signal.payload) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendCollabSignal(
        this.sessionId,
        this.myParticipantId,
        this.hostParticipantId,
        "ANSWER",
        JSON.stringify(answer)
      );
    } else if (signal.signal_type === "ICE_CANDIDATE" && this.pc) {
      const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {
        // See note in HostScreenShareManager - safe to drop.
      }
    }
  }

  stop() {
    this.pc?.close();
    this.pc = null;
    this.onStream(null);
  }
}

export type { CollabSignal, CollabSignalType };
