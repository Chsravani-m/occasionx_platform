from app.core.service_auth import install_internal_auth

# Calls this service makes to other OccasionX services identify
# themselves with the internal key (see app/core/service_auth.py).
# Installed first, before any startup code below makes such a call.
install_internal_auth()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os

env_file = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(env_file, override=True)

from app.api.provider import router as provider_router
from app.api.provider_document import router as provider_document_router
from app.api.provider_document import files_router as provider_document_files_router
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
# Must be registered before the /uploads mount below so the protected
# KYC document route wins over the static file server.
app.include_router(provider_document_files_router)


class PublicUploads(StaticFiles):
    """
    Public media (display pictures, logos, portfolio, promo videos).
    KYC documents live in the same volume under provider-documents/ and
    are refused here - they are only served by the login-checked route
    in app/api/provider_document.py.
    """

    PRIVATE_DIRS = ("provider-documents",)

    async def get_response(self, path, scope):
        normalized = os.path.normpath(path).replace("\\", "/").lstrip("./")
        if normalized.split("/", 1)[0].lower() in self.PRIVATE_DIRS:
            from starlette.exceptions import HTTPException as StarletteHTTPException
            raise StarletteHTTPException(status_code=404)
        return await super().get_response(path, scope)


os.makedirs("uploads", exist_ok=True)

app.mount(
    "/uploads",
    PublicUploads(directory="uploads"),
    name="uploads"
)