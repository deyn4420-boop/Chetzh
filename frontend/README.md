# Realtime Chat Frontend

Next.js (App Router) + TypeScript + Tailwind CSS, talking to the FastAPI
backend over REST (auth, room list, message history) and a native
WebSocket (live chat, typing indicators, presence).

## Running locally (without Docker)

```bash
cp .env.local.example .env.local   # points at http://localhost:8080 by default
npm install
npm run dev
```

Requires the backend to be running separately (see `../chat-backend/README.md`),
reachable at the URL in `NEXT_PUBLIC_API_URL`.

## Project structure

```
app/
├── layout.tsx              # wraps the app in AuthProvider
├── page.tsx                 # redirects to /chat or /login based on auth state
├── login/page.tsx
├── register/page.tsx
└── chat/
    ├── layout.tsx            # sidebar: room list + "new chat" + logout
    ├── page.tsx               # empty state ("select a chat")
    └── [roomId]/page.tsx      # the actual chat window for one room

components/
├── ChatWindow.tsx           # message list + input, ties the room page together
├── MessageBubble.tsx
├── MessageInput.tsx          # debounces typing events so not every keystroke
│                               triggers a WebSocket send
├── TypingIndicator.tsx
├── OnlineBadge.tsx
├── RoomListItem.tsx
└── NewChatModal.tsx           # search users, start a new 1:1 chat

hooks/
├── useAuth.tsx                # JWT in localStorage, resolves current user via /auth/me
└── useChatSocket.ts           # the core hook - connection lifecycle, reconnect
                                 with exponential backoff, message/typing/presence state

lib/
├── api.ts                     # typed fetch wrapper for the REST endpoints
└── types.ts                   # mirrors the backend's Pydantic schemas by hand
```

## How the WebSocket hook works

`useChatSocket(roomId, token)` owns the entire connection lifecycle for one
room:

- Opens a `WebSocket` to `wss://.../ws/{roomId}?token=...` (the JWT goes in
  the query string - browsers can't set custom headers on a WS handshake).
- On `onclose`, reconnects automatically with exponential backoff
  (1s, 2s, 4s... capped at 15s) rather than hammering the server if it's
  down.
- Deduplicates incoming chat messages by id, since a reconnect can
  theoretically overlap with an in-flight message.
- Exposes `sendMessage`, `setTyping`, and the live `messages` /
  `typingUserIds` / `onlineUserIds` state, all driven by the `type` field on
  each incoming WebSocket frame (`chat` / `typing` / `presence` / `error`).

Message **history** (on first loading a room) comes from a separate REST
call (`GET /rooms/{id}/messages`) - the socket only ever carries *live*
messages from the moment it connects onward. `prependHistory` merges the
two into one ordered list.

## Known simplifications (things I'd revisit before calling this production-ready)

- The JWT lives in `localStorage`, which is simple but vulnerable to XSS
  reading it out. A production app would use an httpOnly cookie instead,
  which would also mean handling the WS auth handshake differently (a
  short-lived ticket exchange rather than a token in the query string).
- `lib/types.ts` is hand-maintained to match the backend's Pydantic
  schemas rather than generated - fine at this size, would drift at scale.
  See the backend README for the `openapi-typescript` alternative.
- No message editing/deletion UI yet, and no read-receipt UI (the backend
  field exists, nothing writes to it from the frontend yet).
