"use client";

import { useRef, useState, useEffect } from "react";

import { useChatContext } from "@/context/ChatContext";
import { ChatMessage, sendChatMessage } from "@/services/chatApi";

export default function ChatbotWidget() {
  const { chatContext } = useChatContext();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, loading]);

  const handleSend = async () => {
    const text = input.trim();

    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await sendChatMessage({
        message: text,
        history: messages,
        ...chatContext,
      });

      setMessages([
        ...nextMessages,
        { role: "assistant", content: res.reply },
      ]);

      if (!res.available) {
        setError(res.reply);
      }
    } catch {
      setError("Couldn't reach the assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[480px] w-[340px] flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
          <div className="flex items-center justify-between bg-[#1E3A8A] px-4 py-3">
            <span className="font-semibold text-white">
              OccasionX Assistant
            </span>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-[#F8F6F2] px-3 py-3"
          >
            {messages.length === 0 && (
              <p className="mt-6 text-center text-sm text-gray-400">
                Ask me about how OccasionX works, or - once you&apos;ve
                picked an event type/budget or a category - ask about
                your budget or vendor options.
              </p>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] rounded-lg bg-[#1E3A8A] px-3 py-2 text-sm text-white"
                      : "max-w-[80%] whitespace-pre-line rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#1F2937]"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-gray-400">
                  Typing...
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="border-t border-[#E5E7EB] bg-red-50 px-3 py-1.5 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 border-t border-[#E5E7EB] p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Ask a question..."
              className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-[#C89B3C] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E3A8A] text-2xl text-white shadow-lg hover:bg-[#182E6E]"
        aria-label="Open chat"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
