from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.crud.user import search_users_by_username
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=list[UserOut])
async def search_users(
    q: str = Query(min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    results = await search_users_by_username(db, q)
    return [u for u in results if u.id != current_user.id]
