import sys
from pathlib import Path

# Add backend directory to sys.path to allow imports from app
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from main import app
except ImportError as e:
    print(f"Failed to import app from backend/main.py: {e}")
    raise e
