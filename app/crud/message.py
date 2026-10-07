import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message

_STATUS_ORDER = {"sent": 0, "delivered": 1, "read": 2}


async def create_message(db: AsyncSession, room_id: uuid.UUID, sender_id: uuid.UUID, content: str) -> Message:
    message = Message(room_id=room_id, sender_id=sender_id, content=content)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def get_room_messages(
    db: AsyncSession, room_id: uuid.UUID, before: uuid.UUID | None = None, limit: int = 50
) -> list[Message]:
    query = select(Message).where(Message.room_id == room_id)

    if before is not None:
        anchor = await db.execute(select(Message.created_at).where(Message.id == before))
        anchor_created_at = anchor.scalar_one_or_none()
        if anchor_created_at is not None:
            query = query.where(Message.created_at < anchor_created_at)

    query = query.order_by(Message.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_message_status(db: AsyncSession, message_id: uuid.UUID, status: str) -> Message | None:
    """
    Moves a message's status forward only (sent -> delivered -> read),
    never backwards - a "read" ack arriving before/without a "delivered"
    one still lands on "read" rather than regressing it, and a stale
    "delivered" ack that arrives after "read" (e.g. a slow network) can't
    undo the more advanced state.
    """
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalar_one_or_none()
    if message is None:
        return None

    if _STATUS_ORDER.get(status, 0) > _STATUS_ORDER.get(message.status, 0):
        message.status = status
        await db.commit()
        await db.refresh(message)

    return message