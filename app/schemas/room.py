import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RoomCreate(BaseModel):
    name: str | None = None
    is_group: bool = False
    member_ids: list[uuid.UUID]  # other users to add besides the creator


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str | None
    is_group: bool
    created_at: datetime
