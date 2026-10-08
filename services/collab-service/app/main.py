import os
from fastapi import FastAPI

from app.db.database import Base, engine

# import all models here so create_all sees them
from app.db.models.session import (
    CollabSession,
    SessionParticipant,
    SelectedService,
    ChatMessage,
)

from app.api.session import router as session_router

app = FastAPI(title="Collab Service")

# Production schema is managed by Alembic; see catalog-service/app/main.py.
if os.getenv("AUTO_CREATE_TABLES", "true").lower() == "true":
    Base.metadata.create_all(bind=engine)

app.include_router(session_router)


@app.get("/")
def health():
    return {
        "service": "collab-service",
        "status": "running",
    }
