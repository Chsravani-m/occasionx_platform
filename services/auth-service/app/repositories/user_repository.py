from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.models.role import UserRole


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
    full_name: str,
    phone:str,
    email: str,
    password_hash: str,
    role: UserRole = UserRole.CUSTOMER,
    email_verification_token: str = None
):
    user = User(
        full_name=full_name,
        phone=phone,
        email=email,
        password_hash=password_hash,
        role=role,
        email_verification_token=email_verification_token
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

def get_user_by_phone(
    db: Session,
    phone: str
):
    return (
        db.query(User)
        .filter(
            User.phone == phone
        )
        .first()
    )

def get_all_users(db):
    return db.query(User).all()

def get_user_by_id(
    db,
    user_id
):
    return (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

def save_user(
    db,
    user
):
    db.commit()
    db.refresh(user)

    return user

def delete_user(
    db,
    user
):
    # Related rows (membership_payments, refresh_tokens,
    # password_reset_tokens) all have a plain FK to users.id with no
    # ON DELETE CASCADE, so they have to go first or Postgres raises
    # an IntegrityError.
    from app.db.models.membership_payment import MembershipPayment
    from app.db.models.refresh_token import RefreshToken
    from app.db.models.password_reset import PasswordResetToken

    db.query(MembershipPayment).filter(
        MembershipPayment.user_id == user.id
    ).delete()

    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id
    ).delete()

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id
    ).delete()

    db.delete(user)
    db.commit()