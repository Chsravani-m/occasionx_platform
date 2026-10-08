# app/startup/admin_seed.py

import os
import requests

from app.db.session import SessionLocal
from app.repositories.user_repository import (
    get_user_by_email,
    create_user
)
from app.core.security import hash_password
from app.db.models.role import UserRole

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8002")


def _admin_credentials():
    """
    Startup admin account. Local dev keeps the old defaults so existing
    setups behave the same; in production (APP_ENV=production) the
    credentials must come from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD,
    otherwise no admin is seeded rather than one with a public password.
    """
    email = os.getenv("SUPER_ADMIN_EMAIL")
    password = os.getenv("SUPER_ADMIN_PASSWORD")

    if os.getenv("APP_ENV", "development").lower() == "production":
        if not email or not password:
            print(
                "SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD not set - "
                "skipping admin seed"
            )
            return None, None
        return email, password

    return (
        email or "admin@occasionx.com",
        password or "Admin@123",
    )


def seed_admin():

    email, password = _admin_credentials()

    if not email:
        return

    db = SessionLocal()

    try:

        admin = get_user_by_email(
            db,
            email
        )

        if not admin:

            admin = create_user(
                db=db,
                full_name="OccasionX Admin",
                phone="9999999999",
                email=email,
                password_hash=hash_password(
                    password
                ),
                role=UserRole.ADMIN
            )

            # Seeded from trusted config, so it doesn't go through the
            # email-verification flow (login requires is_verified).
            admin.is_verified = True
            db.commit()

            print("ADMIN CREATED")

            try:
                response = requests.post(
                    f"{USER_SERVICE_URL}/api/v1/users/internal/create-profile",
                    json={
                        "user_id": str(admin.id),
                        "email": admin.email,
                        "full_name": admin.full_name
                    },
                    timeout=5
                )

                print(
                    "ADMIN PROFILE SERVICE RESPONSE:",
                    response.status_code,
                    response.text
                )

            except Exception as e:
                # Non-fatal: GET /users/profile self-heals if this row
                # is missing, so a down user-service at startup
                # shouldn't block auth-service from starting.
                print(
                    "ADMIN PROFILE CREATION FAILED:",
                    str(e)
                )

    finally:
        db.close()