import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    status: str
    created_at: datetime


# --- WebSocket wire formats ---
# Every payload sent over the socket (either direction) has a "type" discriminator
# so the client/server can pattern-match on it without guessing the shape.


class WSIncomingChat(BaseModel):
    """Client -> server: a new chat message."""

    type: Literal["chat"] = "chat"
    content: str


class WSIncomingTyping(BaseModel):
    """Client -> server: typing indicator toggle."""

    type: Literal["typing"] = "typing"
    is_typing: bool


class WSOutgoingChat(BaseModel):
    """Server -> client: a broadcasted chat message."""

    type: Literal["chat"] = "chat"
    message: MessageOut


class WSOutgoingTyping(BaseModel):
    """Server -> client: someone is/isn't typing."""

    type: Literal["typing"] = "typing"
    user_id: uuid.UUID
    is_typing: bool


class WSOutgoingPresence(BaseModel):
    """Server -> client: presence change (user joined/left room)."""

    type: Literal["presence"] = "presence"
    user_id: uuid.UUID
    status: Literal["online", "offline"]


class WSError(BaseModel):
    type: Literal["error"] = "error"
    detail: str
