import { api } from "@/core/api/client";

// "Plan together" group sessions - same collab-service (via the
// gateway's /collab/* proxy) the web app talks to. See the web app's
// src/services/collabApi.ts for the full backend contract.

export interface CollabParticipant {
  id: string;
  user_id: string | null;
  display_name: string;
  role: "HOST" | "GUEST";
  contact?: string | null;
  channel?: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface CollabSelectedService {
  id: string;
  provider_id: string;
  provider_name?: string | null;
  category_name?: string | null;
  service_id?: string | null;
  added_by_name?: string | null;
  created_at: string;
}

export interface CollabChatMessage {
  id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface CollabSessionState {
  id: string;
  host_user_id: string;
  host_name: string;
  title?: string | null;
  status: "ACTIVE" | "CLOSED";
  max_guests: number;
  created_at: string;
  // Live screen mirroring is web-only (see webrtc setup in the web
  // app) - the mobile app can't be the sharer, but a guest here can
  // watch the host's shared screen via an embedded WebView pointed at
  // the web app. See CollabSessionScreen.tsx.
  is_screen_sharing: boolean;
  sharing_participant_id: string | null;
  participants: CollabParticipant[];
  selected_services: CollabSelectedService[];
  messages: CollabChatMessage[];
}

export async function createCollabSession(
  hostUserId: string,
  hostName: string,
  title?: string
): Promise<CollabSessionState> {
  const res = await api.post("/collab/sessions", {
    host_user_id: hostUserId,
    host_name: hostName,
    title: title || null,
  });
  return res.data;
}

export async function getCollabSession(
  sessionId: string
): Promise<CollabSessionState> {
  const res = await api.get(`/collab/sessions/${sessionId}`);
  return res.data;
}

export async function sendCollabInvite(
  sessionId: string,
  hostUserId: string,
  contact: string,
  channel: "EMAIL" | "WHATSAPP",
  guestName?: string
) {
  const res = await api.post(`/collab/sessions/${sessionId}/invites`, {
    host_user_id: hostUserId,
    contact,
    channel,
    guest_name: guestName || null,
  });
  return res.data as {
    participant_id: string;
    invite_token: string;
    invite_link: string;
    delivered: boolean;
  };
}

export async function previewCollabInvite(token: string) {
  const res = await api.get(`/collab/sessions/invites/${token}`);
  return res.data as {
    session_id: string;
    host_name: string;
    title?: string | null;
    guest_name?: string | null;
    already_joined: boolean;
    session_closed: boolean;
  };
}

export async function joinCollabSession(
  token: string,
  displayName?: string,
  userId?: string
) {
  const res = await api.post(`/collab/sessions/invites/${token}/join`, {
    display_name: displayName || null,
    user_id: userId || null,
  });
  return res.data as { session_id: string; participant_id: string };
}

export async function addCollabService(
  sessionId: string,
  participantId: string,
  providerId: string,
  providerName?: string,
  categoryName?: string,
  serviceId?: string
) {
  const res = await api.post(`/collab/sessions/${sessionId}/services`, {
    participant_id: participantId,
    provider_id: providerId,
    provider_name: providerName || null,
    category_name: categoryName || null,
    service_id: serviceId || null,
  });
  return res.data as CollabSelectedService;
}

export async function removeCollabService(sessionId: string, itemId: string) {
  await api.delete(`/collab/sessions/${sessionId}/services/${itemId}`);
}

export async function sendCollabMessage(
  sessionId: string,
  participantId: string,
  message: string
) {
  const res = await api.post(`/collab/sessions/${sessionId}/messages`, {
    participant_id: participantId,
    message,
  });
  return res.data as CollabChatMessage;
}

export async function closeCollabSession(sessionId: string, hostUserId: string) {
  const res = await api.post(
    `/collab/sessions/${sessionId}/close?host_user_id=${hostUserId}`
  );
  return res.data as CollabSessionState;
}
