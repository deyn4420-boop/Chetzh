import type { Message, Room, Token, User } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? `Request failed: ${res.status}`);
  }

  // 204 No Content etc. - nothing to parse
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  register(username: string, email: string, password: string): Promise<User> {
    return request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  },

  login(username: string, password: string): Promise<Token> {
    return request<Token>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  listRooms(token: string): Promise<Room[]> {
    return request<Room[]>("/rooms", {}, token);
  },

  getRoom(token: string, roomId: string): Promise<Room> {
    return request<Room>(`/rooms/${roomId}`, {}, token);
  },

  createRoom(
    token: string,
    name: string | null,
    isGroup: boolean,
    memberIds: string[]
  ): Promise<Room> {
    return request<Room>(
      "/rooms",
      {
        method: "POST",
        body: JSON.stringify({ name, is_group: isGroup, member_ids: memberIds }),
      },
      token
    );
  },

  getRoomHistory(token: string, roomId: string, before?: string): Promise<Message[]> {
    const qs = before ? `?before=${before}` : "";
    return request<Message[]>(`/rooms/${roomId}/messages${qs}`, {}, token);
  },

  searchUsers(token: string, query: string): Promise<User[]> {
    return request<User[]>(`/users/search?q=${encodeURIComponent(query)}`, {}, token);
  },
};

export function wsUrl(roomId: string, token: string): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/ws/${roomId}?token=${encodeURIComponent(token)}`;
}
