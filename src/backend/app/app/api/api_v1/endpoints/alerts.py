from fastapi import APIRouter, Depends, HTTPException
from motor.core import AgnosticDatabase
from bson import ObjectId
from datetime import datetime
from app.api import deps
from app.api.deps import get_current_active_user

router = APIRouter()


def serialize_alert(doc: dict):
    return {
        "id": str(doc["_id"]),
        "member_id": doc.get("member_id"),
        "member_name": doc.get("member_name"),
        "timestamp": doc.get("timestamp").isoformat() if doc.get("timestamp") else None,
        "prediction": doc.get("prediction", "fall"),
        "confidence": doc.get("confidence", 0),
        "acknowledged": doc.get("acknowledged", False),
        "acknowledged_at": doc.get("acknowledged_at").isoformat() if doc.get("acknowledged_at") else None,
        "acknowledged_by": doc.get("acknowledged_by"),
    }


@router.get("")
async def get_alerts(
    db: AgnosticDatabase = Depends(deps.get_db),
    current_user=Depends(deps.get_current_active_user),
):
    alerts = await db["fall_events"].find({}).sort("timestamp", -1).to_list(length=200)
    return [serialize_alert(a) for a in alerts]


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    db: AgnosticDatabase = Depends(deps.get_db),
    current_user=Depends(deps.get_current_active_user),
):
    if not ObjectId.is_valid(alert_id):
        raise HTTPException(status_code=400, detail="Invalid alert id")

    existing = await db["fall_events"].find_one({"_id": ObjectId(alert_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Alert not found")

    await db["fall_events"].update_one(
        {"_id": ObjectId(alert_id)},
        {
            "$set": {
                "acknowledged": True,
                "acknowledged_at": datetime.utcnow(),
                "acknowledged_by": getattr(current_user, "email", "unknown"),
            }
        },
    )

    updated = await db["fall_events"].find_one({"_id": ObjectId(alert_id)})
    return {"status": "ok", "alert": serialize_alert(updated)}