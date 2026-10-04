import uuid
from datetime import datetime

from pydantic import BaseModel


class RoomCreate(BaseModel):
    name: str | None = None
    is_group: bool = False
    member_ids: list[uuid.UUID]


class RoomOut(BaseModel):
    id: uuid.UUID
    name: str | None
    is_group: bool
    created_at: datetime
    # Computed server-side per viewer: for a 1:1 room, the OTHER member's
    # username; for a group room, the room's own name. This is what the
    # frontend should actually show - "name" above is the raw stored
    # value and is kept for completeness, not for display.
    display_name: str