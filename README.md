# Face Emotion Detector

Monorepo containing a React frontend, FastAPI backend, shared constants, and a modular ML layer for facial emotion detection from webcam frames.

## Folder structure

```text
.
├── backend
│   ├── app
│   │   ├── core
│   │   ├── routes
│   │   └── services
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── frontend
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── src
│   │   ├── components
│   │   ├── services
│   │   └── styles
│   └── vite.config.js
├── ml
│   ├── models
│   └── train_emotion_model.py
├── shared
│   └── emotions.json
└── docker-compose.yml
```

## Local development

The project is configured for easy management from the root directory.

### Quick Start (Root)

1.  **Install dependencies**:
    ```bash
    npm run install:all
    ```
2.  **Run full stack**:
    ```bash
    npm run dev
    ```

### Manual Individual Startup

#### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Training a model

Place FER2013-style grayscale images under `ml/data/fer2013/<emotion>/*.png`, then run:

```bash
pip install -r ml/requirements-train.txt
python ml/train_emotion_model.py
```

The backend will automatically load `ml/models/emotion_model.keras` when it exists. If it does not, the API falls back to a heuristic scorer so the end-to-end app still runs locally.

## Docker

```bash
docker compose up --build
```
# Face-emotion-detector
