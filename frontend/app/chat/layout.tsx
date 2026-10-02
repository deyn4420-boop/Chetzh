"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Room } from "@/lib/types";
import { RoomListItem } from "@/components/RoomListItem";
import { NewChatModal } from "@/components/NewChatModal";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (token) api.listRooms(token).then(setRooms).catch(() => {});
  }, [token]);

  if (isLoading || !user || !token) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  const activeRoomId = pathname.split("/")[2];

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="flex w-72 flex-col border-r border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <span className="text-sm font-medium">{user.username}</span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">
            Log out
          </button>
        </div>

        <button
          onClick={() => setShowNewChat(true)}
          className="m-3 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white"
        >
          + New chat
        </button>

        <div className="flex-1 space-y-1 overflow-y-auto px-2">
          {rooms.map((room) => (
            <RoomListItem key={room.id} room={room} isActive={room.id === activeRoomId} />
          ))}
          {rooms.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No chats yet - start one above.</p>
          )}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">{children}</main>

      {showNewChat && (
        <NewChatModal
          token={token}
          onClose={() => setShowNewChat(false)}
          onCreated={(roomId) => {
            setShowNewChat(false);
            api.listRooms(token).then(setRooms).catch(() => {});
            router.push(`/chat/${roomId}`);
          }}
        />
      )}
    </div>
  );
}
