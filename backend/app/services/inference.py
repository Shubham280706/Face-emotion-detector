from __future__ import annotations

import base64
import json
import logging
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.core.config import MODEL_PATH, SHARED_DIR

logger = logging.getLogger(__name__)


class InferenceError(Exception):
    pass


@dataclass
class PredictionResult:
    emotion: str
    confidence: dict[str, float]
    face_box: dict[str, int]
    model_source: str


def load_emotion_labels() -> list[str]:
    labels_path = SHARED_DIR / "emotions.json"
    with labels_path.open("r", encoding="utf-8") as file:
        return json.load(file)


class EmotionModel:
    def predict(self, face_image: np.ndarray) -> tuple[str, dict[str, float]]:
        raise NotImplementedError


class TensorFlowEmotionModel(EmotionModel):
    def __init__(self, model_path: Path, labels: list[str]) -> None:
        import tensorflow as tf

        self.labels = labels
        self.model = tf.keras.models.load_model(model_path)

    def predict(self, face_image: np.ndarray) -> tuple[str, dict[str, float]]:
        batch = np.expand_dims(face_image, axis=(0, -1))
        raw_scores = self.model.predict(batch, verbose=0)[0]
        normalized = _normalize_scores(raw_scores.tolist(), self.labels)
        emotion = max(normalized, key=normalized.get)
        return emotion, normalized


class HeuristicEmotionModel(EmotionModel):
    def __init__(self, labels: list[str]) -> None:
        self.labels = labels

    def predict(self, face_image: np.ndarray) -> tuple[str, dict[str, float]]:
        brightness = float(face_image.mean())
        contrast = float(face_image.std())

        # Gradient-based edge density (replaces cv2.Canny)
        face_uint8 = (face_image * 255).astype(np.float32)
        gy = np.gradient(face_uint8, axis=0)
        gx = np.gradient(face_uint8, axis=1)
        magnitude = np.sqrt(gx**2 + gy**2)
        edge_density = float((magnitude > 30).mean())

        scores = {
            "happy": 0.18 + brightness * 0.24 + edge_density * 0.26,
            "sad": 0.12 + (1.0 - brightness) * 0.25 + (0.35 - edge_density) * 0.10,
            "angry": 0.10 + contrast * 0.30 + edge_density * 0.22,
            "fear": 0.08 + contrast * 0.18 + (1.0 - brightness) * 0.12,
            "neutral": 0.22 + (0.45 - abs(brightness - 0.5)) * 0.25,
            "surprise": 0.10 + edge_density * 0.32 + brightness * 0.08,
            "disgust": 0.06 + (contrast * 0.15) + ((1.0 - edge_density) * 0.04),
        }

        aligned_scores = [max(scores.get(label, 0.05), 0.01) for label in self.labels]
        normalized = _normalize_scores(aligned_scores, self.labels)
        emotion = max(normalized, key=normalized.get)
        return emotion, normalized


def _normalize_scores(scores: list[float], labels: list[str]) -> dict[str, float]:
    score_array = np.array(scores, dtype=np.float32)
    score_array = np.clip(score_array, 1e-6, None)
    score_array /= score_array.sum()
    return {
        label: round(float(score_array[idx]), 4)
        for idx, label in enumerate(labels)
    }


@lru_cache(maxsize=1)
def get_model() -> EmotionModel:
    labels = load_emotion_labels()

    if MODEL_PATH.exists():
        logger.info("Loading TensorFlow model from %s", MODEL_PATH)
        return TensorFlowEmotionModel(MODEL_PATH, labels)

    logger.warning("Model file not found at %s. Falling back to heuristic model.", MODEL_PATH)
    return HeuristicEmotionModel(labels)


def decode_base64_image(data: str) -> np.ndarray:
    payload = data.split(",", maxsplit=1)[-1]
    try:
        binary = base64.b64decode(payload)
    except ValueError as error:
        raise InferenceError("Invalid base64 image payload.") from error
    return decode_image_bytes(binary)


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        return np.array(img)
    except Exception as error:
        raise InferenceError("Unable to decode image.") from error


def _to_grayscale(rgb: np.ndarray) -> np.ndarray:
    """Convert an HxWx3 uint8 RGB array to an HxW uint8 grayscale array."""
    weights = np.array([0.2989, 0.5870, 0.1140], dtype=np.float32)
    return np.dot(rgb.astype(np.float32), weights).astype(np.uint8)


def detect_largest_face(image: np.ndarray) -> tuple[np.ndarray, dict[str, int]]:
    """Center-crop the image and convert to grayscale (no OpenCV required)."""
    height, width = image.shape[:2]
    crop_size = int(min(width, height) * 0.7)
    start_x = max((width - crop_size) // 2, 0)
    start_y = max((height - crop_size) // 2, 0)

    crop = image[start_y : start_y + crop_size, start_x : start_x + crop_size]
    gray = _to_grayscale(crop)

    return gray, {
        "x": int(start_x),
        "y": int(start_y),
        "width": int(crop_size),
        "height": int(crop_size),
    }


def preprocess_face(face: np.ndarray) -> np.ndarray:
    img = Image.fromarray(face).resize((48, 48), Image.BILINEAR)
    return np.array(img, dtype=np.float32) / 255.0


def predict_from_image(image: np.ndarray) -> PredictionResult:
    face, face_box = detect_largest_face(image)
    processed_face = preprocess_face(face)
    model = get_model()
    emotion, confidence = model.predict(processed_face)
    model_source = "tensorflow" if isinstance(model, TensorFlowEmotionModel) else "heuristic"
    return PredictionResult(
        emotion=emotion,
        confidence=confidence,
        face_box=face_box,
        model_source=model_source,
    )


def predict_from_payload(payload: bytes | str) -> PredictionResult:
    image = decode_base64_image(payload) if isinstance(payload, str) else decode_image_bytes(payload)
    return predict_from_image(image)


def serialize_prediction(result: PredictionResult) -> dict[str, Any]:
    return {
        "emotion": result.emotion,
        "confidence": result.confidence,
        "faceBox": result.face_box,
        "modelSource": result.model_source,
    }
