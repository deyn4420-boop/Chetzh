import type { Message } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? "self-end items-end" : "self-start items-start"}`}>
      <div
        className={`rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isOwn
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-900 rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
      <div className="flex items-center gap-1 px-1 text-[11px] text-gray-400">
        <span>{formatTime(message.created_at)}</span>
        {isOwn && message.status === "read" && <span className="text-blue-500">Read</span>}
        {isOwn && message.status === "delivered" && <span>Delivered</span>}
      </div>
    </div>
  );
}
