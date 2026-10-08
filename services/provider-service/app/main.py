from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os

env_file = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(env_file, override=True)

from app.api.provider import router as provider_router
from app.api.provider_document import router as provider_document_router
from app.api.provider_category import (router as provider_category_router)
from app.api.portfolio import (router as portfolio_router)
from app.api.service import (router as service_router)
from app.api.pricing import (router as pricing_router)
from app.api.blocked_date import (router as blocked_date)
from app.api.provider_profile import (router as provider_profile_router)
from app.api.search import router as search_router
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="Provider Service"
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

app.include_router(provider_router)
app.include_router(provider_document_router)
app.include_router(provider_category_router)
app.include_router(portfolio_router)
app.include_router(service_router)
app.include_router(pricing_router)
app.include_router(blocked_date)
app.include_router(provider_profile_router)
app.include_router(search_router)
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)