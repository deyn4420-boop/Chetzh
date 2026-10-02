"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { OnlineBadge } from "@/components/OnlineBadge";
import { MessageInput } from "@/components/MessageInput";
import type { ConnectionStatus } from "@/hooks/useChatSocket";
import type { Message } from "@/lib/types";

export function ChatWindow({
  roomName,
  messages,
  currentUserId,
  typingCount,
  isPeerOnline,
  status,
  onSend,
  onTypingChange,
}: {
  roomName: string;
  messages: Message[];
  currentUserId: string;
  typingCount: number;
  isPeerOnline: boolean;
  status: ConnectionStatus;
  onSend: (content: string) => void;
  onTypingChange: (isTyping: boolean) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-900">{roomName}</h2>
        <div className="flex items-center gap-3">
          {status !== "open" && (
            <span className="text-xs text-amber-600">
              {status === "connecting" ? "Connecting…" : "Reconnecting…"}
            </span>
          )}
          <OnlineBadge online={isPeerOnline} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="m-auto text-sm text-gray-400">No messages yet - say hello.</p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.sender_id === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      <TypingIndicator count={typingCount} />
      <MessageInput onSend={onSend} onTypingChange={onTypingChange} />
    </div>
  );
}
