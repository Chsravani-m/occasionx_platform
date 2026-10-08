import api from "@/lib/apiClient";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  event_type_id?: string;
  event_type_name?: string;
  budget?: number;
  guest_count?: number;
  state_id?: number;
  district_id?: number;
  location_id?: number;
  event_date?: string;
  category_id?: string;
  category_name?: string;
}

export interface ChatRequest extends ChatContext {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  available: boolean;
  reply: string;
  used_tool?: string | null;
}

export const sendChatMessage = async (
  payload: ChatRequest
): Promise<ChatResponse> => {
  const res = await api.post("/ai/chat", payload);

  return res.data;
};
