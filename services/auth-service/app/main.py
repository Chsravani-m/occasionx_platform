import os
from fastapi import FastAPI

from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router
from app.api.v1.membership import router as membership_router
from fastapi.middleware.cors import CORSMiddleware
from app.startup.admin_seed import (
    seed_admin
)

seed_admin()

app = FastAPI(
    title="OccasionX Auth Service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000",
        ).split(",")
        if o.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    admin_router,
    prefix="/api/v1"
)

app.include_router(
    auth_router,
    prefix="/api/v1"
)

app.include_router(
    membership_router,
    prefix="/api/v1"
)


@app.get("/")
def health():
    return {
        "service": "auth-service",
        "status": "UP"
    }