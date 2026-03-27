from fastapi import APIRouter, Depends
from motor.core import AgnosticDatabase
from uuid import UUID
from datetime import datetime
from app.api import deps
from app import crud
from app.api.api_v1.endpoints.activity import broadcast_prediction
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()

# UTD-MHAD activity mapping for demo
# Activity 25 = Lunge (closest to fall in dataset)
FALL_ACTIVITY_CLASS = 25


async def insert_fall_event(
    db: AgnosticDatabase,
    member_id: str,
    member_name: str | None,
    confidence: float,
):
    """Save fall event to MongoDB when prediction = fall"""
    await db["fall_events"].insert_one(
        {
            "member_id": member_id,
            "member_name": member_name,
            "timestamp": datetime.utcnow(),
            "prediction": "fall",
            "confidence": confidence,
            "acknowledged": False,
            "acknowledged_at": None,
            "acknowledged_by": None,
        }
    )


@router.post("/{member_id}")
async def predict_mock(
    member_id: UUID,
    *,
    db: AgnosticDatabase = Depends(deps.get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Mock /predict endpoint — returns fake fall/no-fall data.
    TODO: Replace with real model when ML Team's model.pth is ready.
    """
    import random

    predicted_class = FALL_ACTIVITY_CLASS
    is_fall = predicted_class == FALL_ACTIVITY_CLASS

    result = {
        "predicted_class": predicted_class,
        "predicted_action": "fall" if is_fall else "no_fall",
        "confidence": round(random.uniform(0.85, 0.97), 2)
        if is_fall
        else round(random.uniform(0.70, 0.89), 2),
    }

    member_name = None

    # Get member from MongoDB
    member = await crud.member.get_by_id(db, id=member_id)
    if member:
        member_name = member.first_name + " " + member.last_name
        result["member"] = {
            "id": str(member.id),
            "name": member_name,
        }
    else:
        result["member"] = None

    # Save to MongoDB if fall detected
    if is_fall:
        await insert_fall_event(db, str(member_id), member_name, result["confidence"])
        print(f"Fall event saved to MongoDB for member {member_id}")

    # Broadcast to WebSocket
    await broadcast_prediction(result)

    return {"status": "ok", "result": result}