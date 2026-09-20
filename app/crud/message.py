import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message


async def create_message(db: AsyncSession, room_id: uuid.UUID, sender_id: uuid.UUID, content: str) -> Message:
    message = Message(room_id=room_id, sender_id=sender_id, content=content)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def get_room_messages(
    db: AsyncSession, room_id: uuid.UUID, before: uuid.UUID | None = None, limit: int = 50
) -> list[Message]:
    """
    Paginated history, newest first. Pass `before` (a message id) to page further back -
    keyset pagination scales far better than OFFSET on a table that grows without bound.
    """
    query = select(Message).where(Message.room_id == room_id)

    if before is not None:
        anchor = await db.execute(select(Message.created_at).where(Message.id == before))
        anchor_created_at = anchor.scalar_one_or_none()
        if anchor_created_at is not None:
            query = query.where(Message.created_at < anchor_created_at)

    query = query.order_by(Message.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())
