"use client";

import { useRef, useState, type FormEvent } from "react";

const TYPING_STOP_DELAY_MS = 2000;

export function MessageInput({
  onSend,
  onTypingChange,
}: {
  onSend: (content: string) => void;
  onTypingChange: (isTyping: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyTyping = useRef(false);

  function handleChange(text: string) {
    setValue(text);

    // Fire "typing: true" at most once per burst of keystrokes, and
    // "typing: false" automatically after a pause - this is what keeps
    // every keystroke from triggering its own WebSocket + Redis publish.
    if (!isCurrentlyTyping.current) {
      isCurrentlyTyping.current = true;
      onTypingChange(true);
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isCurrentlyTyping.current = false;
      onTypingChange(false);
    }, TYPING_STOP_DELAY_MS);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setValue("");

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    isCurrentlyTyping.current = false;
    onTypingChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-200 p-3">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Type a message…"
        className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-blue-400"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}
