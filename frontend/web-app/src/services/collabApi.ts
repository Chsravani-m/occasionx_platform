import { api } from "@/lib/apiClient";

// "Plan together" group sessions - a customer (host) invites up to 3
// other customers via an emailed/WhatsApp'd link, and everyone in the
// session sees the same shared list of services plus a chat. All
// calls go through the gateway's /collab/* proxy to collab-service.

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
  is_screen_sharing: boolean;
  sharing_participant_id: string | null;
  participants: CollabParticipant[];
  selected_services: CollabSelectedService[];
  messages: CollabChatMessage[];
}

// WebRTC signaling - see webrtc.ts for how these get used. The
// payload is a JSON string the frontend encodes/decodes; the backend
// just stores and relays it untouched.
export type CollabSignalType =
  | "OFFER"
  | "ANSWER"
  | "ICE_CANDIDATE"
  | "REQUEST_OFFER";

export interface CollabSignal {
  id: string;
  from_participant_id: string;
  to_participant_id: string;
  signal_type: CollabSignalType;
  payload: string | null;
  created_at: string;
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

export async function removeCollabService(
  sessionId: string,
  itemId: string
) {
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

export async function closeCollabSession(
  sessionId: string,
  hostUserId: string
) {
  const res = await api.post(
    `/collab/sessions/${sessionId}/close?host_user_id=${hostUserId}`
  );
  return res.data as CollabSessionState;
}

export async function startScreenShare(sessionId: string, hostUserId: string) {
  const res = await api.post(`/collab/sessions/${sessionId}/screen-share/start`, {
    host_user_id: hostUserId,
  });
  return res.data as CollabSessionState;
}

export async function stopScreenShare(sessionId: string, hostUserId: string) {
  const res = await api.post(`/collab/sessions/${sessionId}/screen-share/stop`, {
    host_user_id: hostUserId,
  });
  return res.data as CollabSessionState;
}

export async function sendCollabSignal(
  sessionId: string,
  fromParticipantId: string,
  toParticipantId: string,
  signalType: CollabSignalType,
  payload?: string
) {
  const res = await api.post(`/collab/sessions/${sessionId}/signals`, {
    from_participant_id: fromParticipantId,
    to_participant_id: toParticipantId,
    signal_type: signalType,
    payload: payload || null,
  });
  return res.data as CollabSignal;
}

export async function getCollabSignals(
  sessionId: string,
  participantId: string,
  since?: string
) {
  const params = new URLSearchParams({ participant_id: participantId });
  if (since) params.set("since", since);
  const res = await api.get(
    `/collab/sessions/${sessionId}/signals?${params.toString()}`
  );
  return res.data as CollabSignal[];
}
