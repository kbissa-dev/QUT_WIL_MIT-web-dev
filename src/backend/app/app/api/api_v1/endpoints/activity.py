import time
from uuid import UUID
from fastapi import File, UploadFile, WebSocket
from fastapi import APIRouter, Depends, HTTPException
from motor.core import AgnosticDatabase

from app import crud
from app.api import deps

from starlette.websockets import WebSocketDisconnect
from typing import Optional, List


# Import the evaluator
from ....api.inference import MultiModalEvaluator

# Your existing WebSocket helpers
from ....api.sockets import send_response  # Update import path

router = APIRouter()

#print current path
import os

# Print current working directory
print("Current working directory:", os.getcwd())
# Load model on startup
model_path = "./app/best_multimodal_model.pth"
if os.path.exists(model_path):
    evaluator = MultiModalEvaluator(
        model_path=model_path,
        device=None  # Auto-detect
    )
else:
    print(f"Model file not found at {model_path}. Model will not be loaded.")
    evaluator = None

# Connected WebSocket clients
connected_clients: List[WebSocket] = []

# List to store inference times for performance monitoring
inferencetimes = []

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time predictions"""
    await websocket.accept()
    connected_clients.append(websocket)
    
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

async def broadcast_prediction(result: dict):
    """Broadcast prediction to all connected clients"""
    disconnected = []
    for client in connected_clients:
        success = await send_response(websocket=client, response=result)
        if not success:
            disconnected.append(client)

@router.post("/{member_id}")
async def activity(
    member_id: UUID,
     *,
    db: AgnosticDatabase = Depends(deps.get_db),
    skeleton_file: Optional[UploadFile] = File(None),
    inertial_file: Optional[UploadFile] = File(None),
    depth_file: Optional[UploadFile] = File(None),
):
    """Predict action and push result to connected clients"""
    
    if evaluator is None:
        raise HTTPException(400, "Model not loaded. Please check server logs.")
    
    if not any([skeleton_file, inertial_file, depth_file]):
        raise HTTPException(400, "At least one modality file must be provided")
    
    # Read file bytes
    skeleton_data = await skeleton_file.read() if skeleton_file else None
    inertial_data = await inertial_file.read() if inertial_file else None
    depth_data = await depth_file.read() if depth_file else None
    
    start_time = time.time()
    # Predict
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

    member = await crud.member.get_by_id(db, id=member_id)

    if member:
        result["member"] = {
            "id": str(member.id),
            "name": member.first_name + " " + member.last_name,
        }
    else:
        result["member"] = None

    print("Prediction result:", result)
    
    # Push to connected clients
    if connected_clients:
        await broadcast_prediction(result)
    
    return {"status": "ok", "clients_notified": len(connected_clients)}
