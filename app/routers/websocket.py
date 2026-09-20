import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_ws
from app.crud.room import is_room_member
from app.database import get_db
from app.models.user import User
from app.schemas.message import WSError, WSIncomingChat, WSIncomingTyping, WSOutgoingPresence, WSOutgoingTyping
from app.services.connection_manager import manager
from app.services.message_service import send_chat_message
from app.services.pubsub import mark_offline, mark_online, publish_to_room

router = APIRouter()


@router.websocket("/ws/{room_id}")
async def chat_websocket(
    websocket: WebSocket,
    room_id: uuid.UUID,
    current_user: User = Depends(get_current_user_ws),
    db: AsyncSession = Depends(get_db),
):
    # Auth already happened in the dependency. Now check room membership
    # before accepting the connection - a valid user shouldn't be able to
    # listen in on a room they don't belong to.
    if not await is_room_member(db, room_id, current_user.id):
        await websocket.close(code=4403, reason="Not a member of this room")
        return

    await manager.connect(room_id, current_user.id, websocket)
    await mark_online(room_id, current_user.id)
    await publish_to_room(
        room_id,
        WSOutgoingPresence(user_id=current_user.id, status="online").model_dump_json(),
    )

    try:
        while True:
            raw = await websocket.receive_text()
            await _handle_incoming(raw, room_id=room_id, user=current_user, db=db, websocket=websocket)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(room_id, current_user.id)
        await mark_offline(room_id, current_user.id)
        await publish_to_room(
            room_id,
            WSOutgoingPresence(user_id=current_user.id, status="offline").model_dump_json(),
        )


async def _handle_incoming(raw: str, *, room_id: uuid.UUID, user: User, db: AsyncSession, websocket: WebSocket) -> None:
    """
    Parse and dispatch one incoming WebSocket frame. Every payload is a JSON
    object with a "type" field - we peek at it before validating against the
    specific schema so an unknown/malformed type gets a clean error back
    instead of the connection just dying.
    """
    import json

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        await websocket.send_text(WSError(detail="Malformed JSON").model_dump_json())
        return

    msg_type = data.get("type")

    if msg_type == "chat":
        try:
            incoming = WSIncomingChat.model_validate(data)
        except ValidationError:
            await websocket.send_text(WSError(detail="Invalid chat payload").model_dump_json())
            return
        # This persists to Postgres AND publishes to Redis, which fans out to
        # every instance holding sockets for this room (including this one) -
        # so we don't separately push it locally here.
        await send_chat_message(db, room_id=room_id, sender_id=user.id, content=incoming.content)

    elif msg_type == "typing":
        try:
            incoming = WSIncomingTyping.model_validate(data)
        except ValidationError:
            await websocket.send_text(WSError(detail="Invalid typing payload").model_dump_json())
            return
        outgoing = WSOutgoingTyping(user_id=user.id, is_typing=incoming.is_typing)
        await publish_to_room(room_id, outgoing.model_dump_json())

    else:
        await websocket.send_text(WSError(detail=f"Unknown message type: {msg_type}").model_dump_json())
