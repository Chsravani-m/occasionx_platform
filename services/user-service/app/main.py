import os
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.users import router

app = FastAPI(
    title="OccasionX User Service"
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
    router,
    prefix="/api/v1"
)


@app.get("/")
def health():
    return {
        "service": "user-service",
        "status": "UP"
    }