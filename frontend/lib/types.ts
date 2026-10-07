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

export type WSIncoming =
  | { type: "chat"; content: string }
  | { type: "typing"; is_typing: boolean }
  | { type: "ack"; message_id: string; status: "delivered" | "read" };

export type WSOutgoing =
  | { type: "chat"; message: Message }
  | { type: "typing"; user_id: string; is_typing: boolean }
  | { type: "presence"; user_id: string; status: "online" | "offline" }
  | { type: "status_update"; message_id: string; status: "delivered" | "read" }
  | { type: "error"; detail: string };