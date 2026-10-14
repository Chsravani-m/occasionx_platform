from app.core.service_auth import install_internal_auth

# Calls this service makes to other OccasionX services identify
# themselves with the internal key (see app/core/service_auth.py).
# Installed first, before any startup code below makes such a call.
install_internal_auth()

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