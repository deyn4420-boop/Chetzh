# Realtime Chat Backend

FastAPI + WebSockets + Postgres + Redis. Built to demonstrate horizontal
scaling of stateful WebSocket connections across multiple server instances.

## Architecture

- **FastAPI** serves both REST endpoints (auth, room management, message
  history) and the WebSocket endpoint (`/ws/{room_id}`) for live chat.
- **Postgres** persists users, rooms, and messages.
- **Redis** does two jobs:
  1. **Pub/sub bridge** - when instance A receives a chat message, it publishes
     to a Redis channel; every instance (including B, C...) subscribed to that
     room's channel receives it and forwards to whichever local sockets it
     holds. This is what lets the app scale horizontally: a single process's
     in-memory socket map (`ConnectionManager`) can't span processes, so Redis
     is the shared nervous system between them.
  2. **Presence tracking** - who's online in a room is stored as a Redis SET,
     since it's ephemeral, high-churn state that doesn't belong in Postgres.

## Running locally

```bash
cp .env.example .env
docker compose up --build
```

This starts Postgres, Redis, two app instances (`app1`, `app2`), and an nginx
load balancer on `localhost:8080`. Running two app instances on purpose - it's
the only way to actually prove the Redis pub/sub bridge is doing its job
rather than everything happening to work because there's only one process.

Run migrations after the containers are up:

```bash
docker compose exec app1 alembic upgrade head
```

## API overview

| Endpoint | Method | Description |
|---|---|---|
| `/auth/register` | POST | Create a user |
| `/auth/login` | POST | Get a JWT |
| `/rooms` | POST | Create a room (1:1 or group) |
| `/rooms` | GET | List the current user's rooms |
| `/rooms/{room_id}/messages` | GET | Paginated message history |
| `/ws/{room_id}?token=...` | WS | Live chat connection |

## WebSocket message format

Every frame (either direction) is JSON with a `type` discriminator:

```json
{"type": "chat", "content": "hey!"}
{"type": "typing", "is_typing": true}
```

Server -> client also sends `{"type": "presence", ...}` when someone joins or
leaves, and `{"type": "error", "detail": "..."}` on malformed input.

## Testing the multi-instance behavior

1. Open two browser tabs (or `wscat` sessions), each authenticated as a
   different user, both connecting to `ws://localhost:8080/ws/{room_id}`.
2. Nginx round-robins connections across `app1` and `app2` - so with two
   clients you'll likely land on different instances.
3. Send a message from one tab - it should appear in the other, proving the
   message crossed process boundaries via Redis, not just an in-memory map.

## Next steps / things intentionally left out for now

- Rate limiting per connection (config values are already in `config.py`,
  just not enforced yet)
- Read receipts (message `status` field exists, no endpoint updates it yet)
- Refresh tokens (access token just expires and requires re-login)
