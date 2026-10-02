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

  // connect() calls itself recursively on reconnect. It's defined via
  // useCallback below, so referencing `connect` directly from inside its
  // own closure would read a stale/undeclared binding. Routing the
  // recursive call through this ref sidesteps that - connectRef.current
  // always points at the latest version once assigned just below.
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (!token || isUnmounted.current) return;

    setStatus("connecting");
    const ws = new WebSocket(wsUrl(roomId, token));
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setStatus("open");
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      const data: WSOutgoing = JSON.parse(event.data);

      switch (data.type) {
        case "chat":
          // Dedup in case of reconnect overlap - a message that already
          // exists by id is ignored rather than appended twice.
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
      setStatus("closed");
      wsRef.current = null;
      if (isUnmounted.current) return;

      // Exponential backoff, capped - avoids hammering the server if it's
      // down, while still recovering quickly from a single dropped frame.
      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt.current,
        RECONNECT_MAX_DELAY_MS
      );
      reconnectAttempt.current += 1;
      reconnectTimer.current = setTimeout(() => connectRef.current(), delay);
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [roomId, token]);

  // Keep the ref pointed at the latest connect closure (fresh roomId/token)
  // so the recursive reconnect call above never invokes a stale version.
  // This has to run in an effect, not during render - refs are an escape
  // hatch from React's render cycle, not something render should write to.
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isUnmounted.current = false;

    // Reset message state for the new room, then open the socket - both
    // happen inside this callback rather than as bare statements in the
    // effect body, which keeps the two state updates batched together
    // instead of causing two separate render passes.
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
    setMessages((prev) => [...older, ...prev]);
  }, []);

  return { messages, typingUserIds, onlineUserIds, status, sendMessage, setTyping, prependHistory };
}
