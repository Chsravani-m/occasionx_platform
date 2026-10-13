from app.core.service_auth import install_internal_auth

# Calls this service makes to other OccasionX services identify
# themselves with the internal key (see app/core/service_auth.py).
# Installed first, before any startup code below makes such a call.
install_internal_auth()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import Base, engine
from app.startup import seed_master_data

from app.api.event_type import router as event_type_router
from app.api.category import router as category_router
from app.api.subcategory import router as subcategory_router
from app.api.event_type_category import router as event_type_category_router
from app.api.catalog import router as catalog_router
from app.api.package_routes import router as package_router
from app.api import location


app = FastAPI(
    title="Catalog Service",
    version="1.0.0"
)


@app.on_event("startup")
def startup_event():
    # Production schema is managed by Alembic (`alembic upgrade head`
    # runs before the app starts in Docker), so AUTO_CREATE_TABLES is
    # false there. Left on by default for local dev.
    if os.getenv("AUTO_CREATE_TABLES", "true").lower() == "true":
        Base.metadata.create_all(bind=engine)
    seed_master_data()


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

# Routers
app.include_router(event_type_router)
app.include_router(category_router)
app.include_router(subcategory_router)
app.include_router(event_type_category_router)
app.include_router(catalog_router)
app.include_router(package_router)
app.include_router(location.router)


@app.get("/")
def health():
    return {
        "service": "catalog-service",
        "status": "running"
    }