import { useCallback, useEffect, useRef, useState } from "react";
import { wsUrl } from "@/lib/api";
import type { Message, WSIncoming, WSOutgoing } from "@/lib/types";

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

export function useChatSocket(roomId: string, token: string | null, currentUserId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmounted = useRef(false);

  const connectRef = useRef<() => void>(() => {});

  const send = useCallback((payload: WSIncoming) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback(() => {
    if (!token || isUnmounted.current) return;

    setStatus("connecting");
    const ws = new WebSocket(wsUrl(roomId, token));
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      reconnectAttempt.current = 0;
      setStatus("open");
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (wsRef.current !== ws) return;
      const data: WSOutgoing = JSON.parse(event.data);

      switch (data.type) {
        case "chat": {
          setMessages((prev) =>
            prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
          );
          // This app only ever shows a message while the recipient's chat
          // window is actively open and connected - there's no separate
          // "app in background" state to distinguish delivered-but-unread
          // from read. Receiving a live message from someone else IS both
          // delivery and reading at once, so both acks fire together here
          // rather than faking a gap between the two.
          if (data.message.sender_id !== currentUserId) {
            send({ type: "ack", message_id: data.message.id, status: "delivered" });
            send({ type: "ack", message_id: data.message.id, status: "read" });
          }         
           if (data.message.sender_id !== currentUserId) {
            // Sending "read" alone is enough - the backend's status ordering
            // treats "read" as already superseding "delivered", and sending
            // both doubled the number of WebSocket frames this client fires
            // per incoming message, which was enough on its own to trip the
            // rate limiter during a backlog of unread messages.
            send({ type: "ack", message_id: data.message.id, status: "read" });
          }
          break;
        }

        case "typing":
          setTypingUserIds((prev) => {
            const next = new Set(prev);
            if (data.is_typing) next.add(data.user_id);
            else next.delete(data.user_id);
            return next;
          });
          break;

        case "presence":
          setOnlineUserIds((prev) => {
            const next = new Set(prev);
            if (data.status === "online") next.add(data.user_id);
            else next.delete(data.user_id);
            return next;
          });
          break;

        case "status_update":
          setMessages((prev) =>
            prev.map((m) => (m.id === data.message_id ? { ...m, status: data.status } : m))
          );
          break;

        case "error":
          console.error("Chat server error:", data.detail);
          break;
      }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;

      setStatus("closed");
      wsRef.current = null;
      if (isUnmounted.current) return;

      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt.current,
        RECONNECT_MAX_DELAY_MS
      );
      reconnectAttempt.current += 1;
      reconnectTimer.current = setTimeout(() => connectRef.current(), delay);
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      setStatus("error");
    };
  }, [roomId, token, currentUserId, send]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isUnmounted.current = false;

    const start = () => {
      setMessages([]);
      connect();
    };
    start();

    return () => {
      isUnmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content: string) => send({ type: "chat", content }),
    [send]
  );

  const setTyping = useCallback(
    (isTyping: boolean) => send({ type: "typing", is_typing: isTyping }),
    [send]
  );

  const markRead = useCallback(
    (messageId: string) => send({ type: "ack", message_id: messageId, status: "read" }),
    [send]
  );

  const prependHistory = useCallback(
    (older: Message[]) => {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const deduped = older.filter((m) => !existingIds.has(m.id));
        return [...deduped, ...prev];
      });

      // History messages from others that aren't already "read" get marked
      // read now - loading the history IS opening the room, same reasoning
      // as the live-message case above.
      for (const m of older) {
        if (m.sender_id !== currentUserId && m.status !== "read") {
          send({ type: "ack", message_id: m.id, status: "read" });
        }
      }
    },
    [currentUserId, send]
  );

  return {
    messages,
    typingUserIds,
    onlineUserIds,
    status,
    sendMessage,
    setTyping,
    markRead,
    prependHistory,
  };
}