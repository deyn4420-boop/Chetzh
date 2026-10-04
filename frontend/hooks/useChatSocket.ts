import { useCallback, useEffect, useRef, useState } from "react";
import { wsUrl } from "@/lib/api";
import type { Message, WSIncoming, WSOutgoing } from "@/lib/types";

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

export function useChatSocket(roomId: string, token: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmounted = useRef(false);

  const connectRef = useRef<() => void>(() => {});

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
        case "chat":
          setMessages((prev) =>
            prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
          );
          break;

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
  }, [roomId, token]);

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

  const send = useCallback((payload: WSIncoming) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const sendMessage = useCallback(
    (content: string) => send({ type: "chat", content }),
    [send]
  );

  const setTyping = useCallback(
    (isTyping: boolean) => send({ type: "typing", is_typing: isTyping }),
    [send]
  );

  const prependHistory = useCallback((older: Message[]) => {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const deduped = older.filter((m) => !existingIds.has(m.id));
      return [...deduped, ...prev];
    });
  }, []);

  return { messages, typingUserIds, onlineUserIds, status, sendMessage, setTyping, prependHistory };
}