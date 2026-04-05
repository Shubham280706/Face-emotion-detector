from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.services.inference import InferenceError, predict_from_payload, serialize_prediction

router = APIRouter(prefix="/emotion", tags=["emotion"])


class EmotionRequest(BaseModel):
    image: str


@router.post("")
async def detect_emotion(
    file: Annotated[UploadFile | None, File()] = None,
    image: Annotated[str | None, Form()] = None,
) -> dict:
    try:
        if file is not None:
            payload = await file.read()
        elif image is not None:
            payload = image
        else:
            raise HTTPException(status_code=400, detail="Provide either a file upload or base64 image.")

        result = predict_from_payload(payload)
        return serialize_prediction(result)
    except InferenceError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.post("/json")
async def detect_emotion_json(request: EmotionRequest) -> dict:
    try:
        result = predict_from_payload(request.image)
        return serialize_prediction(result)
    except InferenceError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.websocket("/ws")
async def emotion_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_text()
            try:
                result = predict_from_payload(payload)
                await websocket.send_json({"ok": True, **serialize_prediction(result)})
            except InferenceError as error:
                await websocket.send_json({"ok": False, "error": str(error)})
    except WebSocketDisconnect:
        return
