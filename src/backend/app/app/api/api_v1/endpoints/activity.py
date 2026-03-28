import time
from uuid import UUID
from datetime import datetime, timezone
from fastapi import File, UploadFile, WebSocket
from fastapi import APIRouter, Depends, HTTPException
from motor.core import AgnosticDatabase

from app import crud
from app.api import deps

from starlette.websockets import WebSocketDisconnect
from typing import Optional, List

from ....api.inference import MultiModalEvaluator
from ....api.sockets import send_response

router = APIRouter()

import os

print("Current working directory:", os.getcwd())

model_path = "./app/best_multimodal_model.pth"
if os.path.exists(model_path):
    evaluator = MultiModalEvaluator(
        model_path=model_path,
        device=None
    )
else:
    print(f"Model file not found at {model_path}. Model will not be loaded.")
    evaluator = None

connected_clients: List[WebSocket] = []
inferencetimes = []


async def insert_fall_event(
    db: AgnosticDatabase,
    member_id: str,
    member_name: str | None,
    confidence: float,
):
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


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: AgnosticDatabase = Depends(deps.get_db),
):
    await websocket.accept()
    try:
        await deps.get_active_websocket_user(db=db, token=token)
    except Exception as e:
        print(f"WebSocket auth failed: {e}")
        await websocket.close(code=1008)
        return

    connected_clients.append(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in connected_clients:
            connected_clients.remove(websocket)


async def broadcast_prediction(result: dict):
    disconnected = []

    for client in connected_clients:
        success = await send_response(websocket=client, response=result)
        if not success:
            disconnected.append(client)

    for client in disconnected:
        if client in connected_clients:
            connected_clients.remove(client)


@router.post("/{member_id}")
async def activity(
    member_id: UUID,
    *,
    db: AgnosticDatabase = Depends(deps.get_db),
    skeleton_file: Optional[UploadFile] = File(None),
    inertial_file: Optional[UploadFile] = File(None),
    depth_file: Optional[UploadFile] = File(None),
):
    if evaluator is None:
        raise HTTPException(400, "Model not loaded. Please check server logs.")

    if not any([skeleton_file, inertial_file, depth_file]):
        raise HTTPException(400, "At least one modality file must be provided")

    skeleton_data = await skeleton_file.read() if skeleton_file else None
    inertial_data = await inertial_file.read() if inertial_file else None
    depth_data = await depth_file.read() if depth_file else None

    start_time = time.time()

    result = evaluator.predict(
        skeleton_data=skeleton_data,
        inertial_data=inertial_data,
        depth_data=depth_data,
        return_probabilities=False
    )

    end_time = time.time()
    inferencetimes.append(end_time - start_time)

    print(f"Inference time: {end_time - start_time:.4f} seconds")
    print(f"Minimum inference time: {min(inferencetimes):.4f} seconds")
    print(f"Maximum inference time: {max(inferencetimes):.4f} seconds")
    print(f"Average inference time: {sum(inferencetimes)/len(inferencetimes):.4f} seconds")

    member_name = None
    member = await crud.member.get_by_id(db, id=member_id)

    if member:
        member_name = f"{member.first_name} {member.last_name}"
        result["member"] = {
            "id": str(member.id),
            "name": member_name,
        }
    else:
        result["member"] = None

    # Default fields so frontend always gets consistent shape
    result.setdefault("alert_id", None)
    result.setdefault("timestamp", datetime.now(timezone.utc).isoformat())

    # If activity route ever predicts a fall, persist it too
    if result.get("predicted_action") == "fall":
        alert_meta = await insert_fall_event(
            db=db,
            member_id=str(member_id),
            member_name=member_name,
            confidence=result.get("confidence", 0),
        )
        result["alert_id"] = alert_meta["alert_id"]
        result["timestamp"] = alert_meta["timestamp"]

    print("Prediction result:", result)

    if connected_clients:
        await broadcast_prediction(result)

    return {
        "status": "ok",
        "clients_notified": len(connected_clients),
        "result": result,
    }