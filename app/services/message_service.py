import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.message import create_message
from app.schemas.message import MessageOut, WSOutgoingChat
from app.services.pubsub import publish_to_room


async def send_chat_message(db: AsyncSession, room_id: uuid.UUID, sender_id: uuid.UUID, content: str) -> MessageOut:
    """
    Persist the message to Postgres, then broadcast it to every instance via Redis.
    Order matters: we write to the DB first so the message has a real id/timestamp
    before it goes out over the wire - the client should never see a message that
    doesn't durably exist yet.
    """
    message = await create_message(db, room_id=room_id, sender_id=sender_id, content=content)
    message_out = MessageOut.model_validate(message)

    outgoing = WSOutgoingChat(message=message_out)
    await publish_to_room(room_id, outgoing.model_dump_json())

    return message_out
