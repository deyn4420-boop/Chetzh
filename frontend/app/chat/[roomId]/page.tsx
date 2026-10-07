"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChatSocket } from "@/hooks/useChatSocket";
import { ChatWindow } from "@/components/ChatWindow";
import { api } from "@/lib/api";
import type { Room } from "@/lib/types";

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { user, token } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);

  const { messages, typingUserIds, onlineUserIds, status, sendMessage, setTyping, prependHistory } =
    useChatSocket(roomId, token, user?.id ?? null);

  useEffect(() => {
    if (!token) return;
    api.getRoom(token, roomId).then(setRoom).catch(() => setRoom(null));
    api
      .getRoomHistory(token, roomId)
      .then((history) => prependHistory(history.reverse()))
      .catch(() => {});
  }, [token, roomId, prependHistory]);

  if (!user || !token) return null;

  return (
    <ChatWindow
      roomName={room?.display_name ?? "Chat"}
      messages={messages}
      currentUserId={user.id}
      typingCount={[...typingUserIds].filter((id) => id !== user.id).length}
      isPeerOnline={[...onlineUserIds].some((id) => id !== user.id)}
      status={status}
      onSend={sendMessage}
      onTypingChange={setTyping}
    />
  );
}