from app.db.models.role import UserRole
import os
import requests

from app.repositories.user_repository import (
    create_user,
    get_user_by_email,
    get_all_users,
    get_user_by_id,
    save_user,
    delete_user as _delete_user_row
)

from app.core.security import hash_password

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8002")

def create_admin(
    db,
    email,
    password
):
    existing_user = get_user_by_email(
        db,
        email
    )

    if existing_user:
        raise Exception(
            "Email already exists"
        )

    user = create_user(
        db=db,
        email=email,
        password_hash=hash_password(password),
        role=UserRole.ADMIN
    )

    try:
        response = requests.post(
            f"{USER_SERVICE_URL}/api/v1/users/internal/create-profile",
            json={
                "user_id": str(user.id),
                "email": user.email,
                "full_name": (
                    getattr(user, "full_name", None)
                    or email.split("@")[0]
                )
            },
            timeout=5
        )

        print(
            "ADMIN PROFILE SERVICE RESPONSE:",
            response.status_code,
            response.text
        )

    except Exception as e:
        # Non-fatal: GET /users/profile self-heals if this row is
        # missing, so a down user-service shouldn't block admin creation.
        print(
            "ADMIN PROFILE CREATION FAILED:",
            str(e)
        )

    return user

def list_users(db):
    return get_all_users(db)

def get_user(
    db,
    user_id
):
    user = get_user_by_id(
        db,
        user_id
    )

    if not user:
        raise Exception(
            "User not found"
        )

    return user

def activate_user(
    db,
    user_id
):
    user = get_user_by_id(
        db,
        user_id
    )

    if not user:
        raise Exception(
            "User not found"
        )

    user.is_active = True

    return save_user(
        db,
        user
    )

def deactivate_user(
    db,
    user_id
):
    user = get_user_by_id(
        db,
        user_id
    )

    if user.email == os.getenv("SUPER_ADMIN_EMAIL"):
        raise Exception(
            "Super Admin cannot be deactivated"
    )

    if not user:
        raise Exception(
            "User not found"
        )

    user.is_active = False

    return save_user(
        db,
        user
    )

def delete_user_by_email(
    db,
    email
):
    user = get_user_by_email(
        db,
        email
    )

    if not user:
        raise Exception(
            "User not found"
        )

    if user.email == os.getenv("SUPER_ADMIN_EMAIL"):
        raise Exception(
            "Super Admin cannot be deleted"
        )

    _delete_user_row(
        db,
        user
    )

def update_user_role(
    db,
    user_id,
    role
):
    user = get_user_by_id(
        db,
        user_id
    )

    if user.email == os.getenv("SUPER_ADMIN_EMAIL"):
        raise Exception(
            "Super Admin role cannot be changed"
    )

    if not user:
        raise Exception(
            "User not found"
        )

    user.role = UserRole(role)

    return save_user(
        db,
        user
    )
