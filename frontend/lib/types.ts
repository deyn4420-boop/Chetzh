// Mirrors app/schemas/*.py on the backend. Kept hand-written and in sync
// manually for a project this size - see README for the tradeoff note on
// generating these from the OpenAPI schema instead, once the API stabilizes.

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface Room {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  display_name: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  status: "sent" | "delivered" | "read";
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// A room enriched client-side for display purposes - the backend's RoomOut
// doesn't include member info, so the room list page fills this in itself
// (see app/chat/page.tsx) rather than requiring a backend change.
export interface RoomWithDisplayName extends Room {
  displayName: string;
}

// --- WebSocket wire formats - mirrors app/schemas/message.py exactly ---

export type WSIncoming =
  | { type: "chat"; content: string }
  | { type: "typing"; is_typing: boolean };

export type WSOutgoing =
  | { type: "chat"; message: Message }
  | { type: "typing"; user_id: string; is_typing: boolean }
  | { type: "presence"; user_id: string; status: "online" | "offline" }
  | { type: "error"; detail: string };
