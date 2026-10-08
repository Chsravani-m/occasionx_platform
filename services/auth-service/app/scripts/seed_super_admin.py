from app.db.database import SessionLocal
from app.db.models.user import User
from app.db.models.role import UserRole
from app.core.security import hash_password
import os
import requests

db = SessionLocal()

email = os.getenv("SUPER_ADMIN_EMAIL")
password = os.getenv("SUPER_ADMIN_PASSWORD")

existing = (
    db.query(User)
    .filter(User.email == email)
    .first()
)

if existing:
    print("Super Admin already exists")
    exit()

admin = User(
    email=email,
    password_hash=hash_password(password),
    role=UserRole.ADMIN,
    is_active=True,
    is_verified=True
)

db.add(admin)
db.commit()
db.refresh(admin)

print("Super Admin Created")

try:
    response = requests.post(
        "http://localhost:8002/api/v1/users/internal/create-profile",
        json={
            "user_id": str(admin.id),
            "email": admin.email,
            "full_name": (
                admin.full_name
                or email.split("@")[0]
            )
        },
        timeout=5
    )

    print(
        "SUPER ADMIN PROFILE SERVICE RESPONSE:",
        response.status_code,
        response.text
    )

except Exception as e:
    # Non-fatal: GET /users/profile self-heals if this row is missing.
    print(
        "SUPER ADMIN PROFILE CREATION FAILED:",
        str(e)
    )