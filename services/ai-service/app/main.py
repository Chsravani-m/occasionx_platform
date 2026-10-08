from pathlib import Path

from dotenv import load_dotenv

env_file = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_file, override=True)

from fastapi import FastAPI

from app.api.ai_proposal import (
    router as ai_proposal_router
)
from app.api.chat import (
    router as chat_router
)

app = FastAPI(
    title="AI Service",
    version="1.0.0"
)

app.include_router(ai_proposal_router)
app.include_router(chat_router)


@app.get("/")
def health():
    return {
        "service": "ai-service",
        "status": "running"
    }
