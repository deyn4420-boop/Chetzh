import uuid
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    """
    Tracks which WebSocket connections THIS process is holding, keyed by room.

    Important: this only knows about sockets local to this process. If you run
    more than one server instance, a message from a user connected to instance A
    needs to reach a user connected to instance B - that's what services/pubsub.py
    is for. This class is deliberately dumb; it doesn't know Redis exists.
    """

    def __init__(self) -> None:
        # room_id -> {user_id -> WebSocket}
        self._rooms: dict[uuid.UUID, dict[uuid.UUID, WebSocket]] = defaultdict(dict)

    async def connect(self, room_id: uuid.UUID, user_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms[room_id][user_id] = websocket

    def disconnect(self, room_id: uuid.UUID, user_id: uuid.UUID) -> None:
        room = self._rooms.get(room_id)
        if room and user_id in room:
            del room[user_id]
        if room is not None and not room:
            del self._rooms[room_id]

    async def send_to_local_room(self, room_id: uuid.UUID, payload: str, exclude_user: uuid.UUID | None = None) -> None:
        """Push a raw JSON string to every socket THIS process holds for the room."""
        room = self._rooms.get(room_id, {})
        stale: list[uuid.UUID] = []

        for user_id, websocket in room.items():
            if user_id == exclude_user:
                continue
            try:
                await websocket.send_text(payload)
            except Exception:
                # Socket died without a clean close event - mark for cleanup
                stale.append(user_id)

        for user_id in stale:
            self.disconnect(room_id, user_id)

    def local_room_user_ids(self, room_id: uuid.UUID) -> list[uuid.UUID]:
        return list(self._rooms.get(room_id, {}).keys())


# Singleton - one per process, imported wherever needed
manager = ConnectionManager()
