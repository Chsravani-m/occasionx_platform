from sqlalchemy.orm import Session

from app.repositories.user_repository import (
    get_user_by_email,
    create_user
)

from app.core.security import hash_password


def register_user(
    db: Session,
    email: str,
    password: str
):
    existing_user = get_user_by_email(
        db,
        email
    )

    if existing_user:
        raise Exception(
            "Email already exists"
        )

    hashed_password = hash_password(
        password
    )

    return create_user(
        db,
        email,
        hashed_password
    )

from app.core.security import (
    verify_password,
    create_access_token
)

def login_user(
    db,
    email,
    password
):
    user = get_user_by_email(
        db,
        email
    )

    if not user:
        raise Exception("Invalid credentials")

    if not verify_password(
        password,
        user.password
    ):
        raise Exception("Invalid credentials")

    token = create_access_token(
        {"sub": user.email}
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }