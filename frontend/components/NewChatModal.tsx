"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function NewChatModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    // Both branches (too-short query vs. a real search) clear/set results
    // from inside a timer callback rather than as a bare statement in the
    // effect body, so the clear-on-short-query case doesn't cause an extra
    // synchronous render pass.
    const handle = setTimeout(() => {
      if (trimmed.length < 2) {
        setResults([]);
        return;
      }
      api.searchUsers(token, trimmed).then(setResults).catch(() => setResults([]));
    }, 300);

    return () => clearTimeout(handle);
  }, [query, token]);

  async function startChat(user: User) {
    setIsCreating(true);
    try {
      // Setting the room's name to the other user's username at creation
      // time means the room list can display something meaningful without
      // needing a separate "who's in this room" lookup.
            const room = await api.createRoom(token, null, false, [user.id]);
      onCreated(room.id);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Start a new chat</h2>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
            Close
          </button>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />

        <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => startChat(u)}
              disabled={isCreating}
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {u.username}
            </button>
          ))}
          {query.trim().length >= 2 && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
