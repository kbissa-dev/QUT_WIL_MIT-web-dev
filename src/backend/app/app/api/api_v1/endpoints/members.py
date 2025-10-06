from typing import List
from fastapi import APIRouter, Depends, HTTPException
from motor.core import AgnosticDatabase

from app import crud
from app.api import deps
from app.schemas.member import Member
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[Member])
async def read_members(
    *,
    db: AgnosticDatabase = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> List[Member]:
    """
    Retrieve all members. Only accessible by admin and superuser.
    """
    if not current_user.is_superuser and not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="You don't have enough privileges"
        )
    return await crud.member.get_multi(db, skip=skip, limit=limit)

