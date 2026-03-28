from fastapi import APIRouter, Depends
from motor.core import AgnosticDatabase
from uuid import UUID
from datetime import datetime, timezone
from bson import ObjectId

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
    """Save fall event to MongoDB and return inserted alert metadata."""
    event_timestamp = datetime.now(timezone.utc)

    event_doc = {
        "member_id": member_id,
        "member_name": member_name,
        "timestamp": event_timestamp,
        "prediction": "fall",
        "confidence": confidence,
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None,
    }

    insert_result = await db["fall_events"].insert_one(event_doc)

    return {
        "alert_id": str(insert_result.inserted_id),
        "timestamp": event_timestamp.isoformat(),
    }


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
        "alert_id": None,
        "timestamp": None,
    }

    member_name = None

    # Get member from MongoDB
    member = await crud.member.get_by_id(db, id=member_id)
    if member:
        member_name = f"{member.first_name} {member.last_name}"
        result["member"] = {
            "id": str(member.id),
            "name": member_name,
        }
    else:
        result["member"] = None

    # Save to MongoDB if fall detected
    if is_fall:
        alert_meta = await insert_fall_event(
            db=db,
            member_id=str(member_id),
            member_name=member_name,
            confidence=result["confidence"],
        )
        result["alert_id"] = alert_meta["alert_id"]
        result["timestamp"] = alert_meta["timestamp"]

        print(
            f"Fall event saved to MongoDB for member {member_id}, alert_id={result['alert_id']}"
        )

    # Broadcast to WebSocket
    await broadcast_prediction(result)

    return {"status": "ok", "result": result}