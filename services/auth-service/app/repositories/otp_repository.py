from sqlalchemy.orm import Session

from app.db.models.otp import OTP
from datetime import datetime

def save_otp(
    db: Session,
    email: str,
    otp_code: str,
    expires_at: datetime
):
    otp = OTP(
        email=email,
        otp_code=otp_code,
        expires_at=expires_at
    )

    db.add(otp)
    db.commit()
    db.refresh(otp)

    return otp


def get_otp(
    db: Session,
    email: str,
    otp_code: str
):
    return (
        db.query(OTP)
        .filter(
            OTP.email == email,
            OTP.otp_code == otp_code
        )
        .order_by(
        OTP.created_at.desc()
    )
        .first()
    )
def increment_attempt(
    db,
    otp
):
    otp.attempts += 1

    db.commit()
    db.refresh(otp)

    return otp

def mark_otp_verified(
    db: Session,
    otp: OTP
):
    otp.verified = True

    db.commit()
    db.refresh(otp)

    return otp

def mark_otp_used(
    db: Session,
    otp: OTP
):
    otp.used = True

    db.commit()
    db.refresh(otp)

    return otp

def invalidate_old_otps(
    db,
    email
):
    db.query(OTP).filter(
        OTP.email == email,
        OTP.used == False
    ).update(
        {
            "used": True
        }
    )

    db.commit()

def get_latest_otp(
    db,
    email
):
    return (
        db.query(OTP)
        .filter(
            OTP.email == email
        )
        .order_by(
            OTP.created_at.desc()
        )
        .first()
    )