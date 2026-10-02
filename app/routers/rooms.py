import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.crud.room import create_room, get_room_by_id, get_user_rooms, is_room_member
from app.crud.message import get_room_messages
from app.database import get_db
from app.models.user import User
from app.schemas.message import MessageOut
from app.schemas.room import RoomCreate, RoomOut

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room_endpoint(
    room_in: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = await create_room(db, creator_id=current_user.id, room_in=room_in)
    return room


@router.get("", response_model=list[RoomOut])
async def list_my_rooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_rooms(db, current_user.id)


@router.get("/{room_id}", response_model=RoomOut)
async def get_room(
    room_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await is_room_member(db, room_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this room")

    room = await get_room_by_id(db, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return room


@router.get("/{room_id}/messages", response_model=list[MessageOut])
async def get_message_history(
    room_id: uuid.UUID,
    before: uuid.UUID | None = Query(default=None, description="Message id to page backwards from"),
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await is_room_member(db, room_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this room")

    return await get_room_messages(db, room_id=room_id, before=before, limit=limit)
