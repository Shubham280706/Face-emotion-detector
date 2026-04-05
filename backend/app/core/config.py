from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel


ROOT_DIR = Path(__file__).resolve().parents[3]
SHARED_DIR = ROOT_DIR / "shared"
ML_DIR = ROOT_DIR / "ml"
MODEL_PATH = ML_DIR / "models" / "emotion_model.keras"


class Settings(BaseModel):
    app_name: str = "Face Emotion Detector API"
    app_version: str = "1.0.0"
    api_prefix: str = "/api"
    frontend_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    inference_interval_ms: int = 500


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
