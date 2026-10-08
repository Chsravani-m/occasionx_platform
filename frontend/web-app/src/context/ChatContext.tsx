"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { ChatContext as ChatContextShape } from "@/services/chatApi";

interface ChatContextValue {
  chatContext: ChatContextShape;
  setChatContext: (patch: ChatContextShape) => void;
  clearChatContext: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(
  undefined
);

/**
 * Lets pages (Build Your Own Package, AI + Custom, category browsing)
 * tell the chatbot what the user currently has selected - event
 * type/budget/guest count/location, or a specific category - so the
 * assistant can answer budget/vendor questions with real numbers
 * without re-asking for context it can already see on screen.
 *
 * Purely additive: if no page has set anything, the chatbot just
 * behaves as a general FAQ assistant.
 */
export function ChatContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatContext, setChatContextState] = useState<ChatContextShape>(
    {}
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      chatContext,
      setChatContext: (patch) =>
        setChatContextState((prev) => ({ ...prev, ...patch })),
      clearChatContext: () => setChatContextState({}),
    }),
    [chatContext]
  );

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);

  if (!ctx) {
    throw new Error(
      "useChatContext must be used within a ChatContextProvider"
    );
  }

  return ctx;
}
