from uuid import UUID
from pymongo.database import Database

from app import crud, schemas
from app.core.config import settings

async def init_db(db: Database) -> None:
    await init_default_members(db)
    user = await crud.user.get_by_email(db, email=settings.FIRST_SUPERUSER)
    if not user:
        # Create user auth
        user_in = schemas.UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
            full_name=settings.FIRST_SUPERUSER,
        )
        user = await crud.user.create(db, obj_in=user_in)  # noqa: F841

async def init_default_members(db: Database) -> None:
    """Initialize default members if none exist."""
    print("Initializing default members...")
    # Define default members data
    default_members = [
        {
            "id": UUID('2e921ac3-4a2a-47bf-a92d-9d4689717e57'),
            "first_name": "Harry",
            "last_name": "Potter",
            "date_of_birth": "1950-01-01",
        },
        {
            "id": UUID('3e921ac3-4a2a-47bf-a92d-9d4689717e57'),
            "first_name": "Ronald",
            "last_name": "Weasley",
            "date_of_birth": "1950-01-01",
        }
    ]
    # Create each member
    for member_data in default_members:
        existing_member = await crud.member.get_by_id(db, id=member_data["id"])
        if existing_member:
            continue  # Skip if member already exists
        member_in = schemas.MemberCreateWithID(**member_data)
        member = await crud.member.create(db, obj_in=member_in)
        assert member.id == member_data["id"]

