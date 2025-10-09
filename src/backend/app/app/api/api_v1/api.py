from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    login,
    users,
    proxy,
    members,
    member,
    activity,
)

api_router = APIRouter()
api_router.include_router(login.router, prefix="/login", tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(proxy.router, prefix="/proxy", tags=["proxy"])
api_router.include_router(members.router, prefix="/members", tags=["members"])
api_router.include_router(member.router, prefix="/member", tags=["member"])
api_router.include_router(activity.router, prefix="/activity", tags=["activity"])
