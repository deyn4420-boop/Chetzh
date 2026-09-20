import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.room import Room, RoomMember
from app.schemas.room import RoomCreate


async def create_room(db: AsyncSession, creator_id: uuid.UUID, room_in: RoomCreate) -> Room:
    room = Room(name=room_in.name, is_group=room_in.is_group)
    db.add(room)
    await db.flush()  # assign room.id before creating members

    member_ids = set(room_in.member_ids) | {creator_id}
    for uid in member_ids:
        db.add(RoomMember(room_id=room.id, user_id=uid))

    await db.commit()
    await db.refresh(room)
    return room


async def get_room_by_id(db: AsyncSession, room_id: uuid.UUID) -> Room | None:
    result = await db.execute(select(Room).where(Room.id == room_id))
    return result.scalar_one_or_none()


async def get_user_rooms(db: AsyncSession, user_id: uuid.UUID) -> list[Room]:
    result = await db.execute(
        select(Room).join(RoomMember).where(RoomMember.user_id == user_id)
    )
    return list(result.scalars().all())


async def is_room_member(db: AsyncSession, room_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(RoomMember).where(RoomMember.room_id == room_id, RoomMember.user_id == user_id)
    )
    return result.scalar_one_or_none() is not None
