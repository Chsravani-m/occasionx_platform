from app.core.service_auth import install_internal_auth

# Calls this service makes to other OccasionX services identify
# themselves with the internal key (see app/core/service_auth.py).
# Installed first, before any startup code below makes such a call.
install_internal_auth()

from fastapi import FastAPI

from app.api.booking import router as booking_router
from app.api.notification import router as notification_router
from app.api.wishlist import router as wishlist_router
from app.api.payment import router as payment_router
from app.api.review import router as review_router
from app.api.booking_charge import router as booking_charge_router

app = FastAPI(title="OccasionX")

app.include_router(
    booking_router
)

app.include_router(
    notification_router
)

app.include_router(
    wishlist_router
)

app.include_router(
    payment_router
)

app.include_router(
    review_router
)

app.include_router(
    booking_charge_router
)