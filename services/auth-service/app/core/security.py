from passlib.context import CryptContext
import secrets

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(
    plain_password: str,
    hashed_password: str
):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )

from jose import JWTError, jwt
from datetime import datetime, timedelta

from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")


def create_access_token(data: dict):
    payload = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=30)

    payload.update({"exp": expire})

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def decode_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        return None

def create_refresh_token(
    data: dict
):
    payload = data.copy()

    expire = datetime.utcnow() + timedelta(
        days=7
    )

    # Marked so the services refuse it as an access token - it may only
    # be exchanged at /auth/refresh.
    payload.update(
        {"exp": expire, "type": "refresh"}
    )

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

ONBOARDING_TOKEN_HOURS = 24


def create_onboarding_token(user_id: str, provider_id: str):
    """
    Limited token for a provider who has just signed up and is still in
    the registration wizard (they can't log in until the registration
    fee is paid and the account activated). provider-service accepts it
    only for that provider's own onboarding endpoints; every other
    endpoint rejects it (see app/core/service_auth.py, ONBOARDING_SCOPE).
    """
    payload = {
        "sub": str(user_id),
        "role": "PROVIDER",
        "provider_id": str(provider_id),
        "scope": "provider_onboarding",
        "exp": datetime.utcnow() + timedelta(hours=ONBOARDING_TOKEN_HOURS),
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def generate_verification_token():
    return secrets.token_urlsafe(32)