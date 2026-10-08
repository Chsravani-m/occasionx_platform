from fastapi import FastAPI

from app.api.package_recommendation import (
    router as package_recommendation_router
)
from app.api.provider_selection import (
    router as provider_selection_router
)
from app.api.budget_calculator import (
    router as budget_calculator_router
)
from app.api.auto_package import (
    router as auto_package_router
)
from app.api.budget_estimate import (
    router as budget_estimate_router
)
from app.api.vendor_recommend import (
    router as vendor_recommend_router
)

app = FastAPI(
    title="Search Service",
    version="1.0.0"
)

app.include_router(package_recommendation_router)
app.include_router(provider_selection_router)
app.include_router(budget_calculator_router)
app.include_router(auto_package_router)
app.include_router(budget_estimate_router)
app.include_router(vendor_recommend_router)


@app.get("/")
def health():
    return {
        "service": "search-service",
        "status": "running"
    }