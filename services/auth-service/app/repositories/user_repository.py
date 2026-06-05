from sqlalchemy.orm import Session

from app.models.user import User


def get_user_by_email(
    db: Session,
    email: str
):
    return (
        db.query(User)
        .filter(User.email == email)
        .first()
    )


def create_user(
    db: Session,
    email: str,
    password: str
):
    user = User(
        email=email,
        password=password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user