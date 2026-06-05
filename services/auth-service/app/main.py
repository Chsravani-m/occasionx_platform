from fastapi import FastAPI

from app.db.database import Base
from app.db.database import engine

from app.models.user import User
from app.api.auth_routes import router as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="OccasionX Auth Service")

app.include_router(auth_router)

@app.get("/health")
def health():
    return {"status": "UP"}

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)