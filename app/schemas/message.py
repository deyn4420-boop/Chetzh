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


class WSIncomingChat(BaseModel):
    type: Literal["chat"] = "chat"
    content: str


class WSIncomingTyping(BaseModel):
    type: Literal["typing"] = "typing"
    is_typing: bool


class WSIncomingAck(BaseModel):
    """Client -> server: acknowledges it received (or is viewing) a message."""

    type: Literal["ack"] = "ack"
    message_id: uuid.UUID
    status: Literal["delivered", "read"]


class WSOutgoingChat(BaseModel):
    type: Literal["chat"] = "chat"
    message: MessageOut


class WSOutgoingTyping(BaseModel):
    type: Literal["typing"] = "typing"
    user_id: uuid.UUID
    is_typing: bool


class WSOutgoingPresence(BaseModel):
    type: Literal["presence"] = "presence"
    user_id: uuid.UUID
    status: Literal["online", "offline"]


class WSOutgoingStatusUpdate(BaseModel):
    """Server -> client: a message's delivery/read status changed."""

    type: Literal["status_update"] = "status_update"
    message_id: uuid.UUID
    status: Literal["delivered", "read"]


class WSError(BaseModel):
    type: Literal["error"] = "error"
    detail: str