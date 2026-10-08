"""
Redis-backed OTP storage - replaces the old otp_codes DB table
(app/db/models/otp.py, app/repositories/otp_repository.py, both still
present but no longer called from anywhere as of this change).

Login OTPs are short-lived by nature, so they don't belong in
Postgres: a DB row needs an explicit expiry check on every read
(`expires_at < utcnow()`) and never actually goes away on its own,
whereas Redis expires the key itself - `get_otp()` returning None
already means "doesn't exist or expired," no separate check needed.

One Redis hash per identifier (email, to match how the rest of
auth_service.py already looks users up) holds the whole OTP record:

    otp:{email} -> {code, attempts, verified, used}   TTL = OTP_TTL_SECONDS

`verified`/`used` mirror the old two-step flow: verify_otp() marks
`verified`, otp_login() then checks `verified` and marks `used`. A
second, separate key enforces a short cooldown between sends so a user
mashing "resend" doesn't burn through your WhatsApp message quota (and
your bill - Meta charges per delivered template message).

Configure via a .env file in services/auth-service/:

    OTP_TTL_SECONDS=240        # 4 minutes
    OTP_MAX_ATTEMPTS=5
    OTP_RESEND_COOLDOWN_SECONDS=30
"""

import os

from dotenv import load_dotenv

from app.redis_client import get_redis

load_dotenv()

OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "240"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))


def _otp_key(email: str) -> str:
    return f"otp:{email.strip().lower()}"


def _cooldown_key(email: str) -> str:
    return f"otp_cooldown:{email.strip().lower()}"


def check_and_set_cooldown(email: str) -> bool:
    """
    Returns True and starts the cooldown window if the caller is clear
    to send a new OTP; returns False if a send/resend happened too
    recently. Uses SET ... NX EX so the check-and-set is atomic - two
    near-simultaneous resend clicks can't both slip through.
    """
    r = get_redis()
    return bool(
        r.set(_cooldown_key(email), "1", nx=True, ex=OTP_RESEND_COOLDOWN_SECONDS)
    )


def save_otp(email: str, otp_code: str) -> None:
    """
    Issues a fresh OTP. Overwrites whatever was there before (a fresh
    HSET + EXPIRE), which is exactly the old invalidate_old_otps() +
    save_otp() combination collapsed into one step - there's no
    concept of keeping old rows around in Redis, the new key just
    replaces the old record outright.
    """
    r = get_redis()
    key = _otp_key(email)

    r.hset(
        key,
        mapping={"code": otp_code, "attempts": 0, "verified": 0, "used": 0},
    )
    r.expire(key, OTP_TTL_SECONDS)


def get_otp(email: str) -> "dict | None":
    r = get_redis()
    data = r.hgetall(_otp_key(email))
    return data or None


def increment_attempt(email: str) -> int:
    r = get_redis()
    return r.hincrby(_otp_key(email), "attempts", 1)


def mark_verified(email: str) -> None:
    get_redis().hset(_otp_key(email), "verified", 1)


def mark_used(email: str) -> None:
    get_redis().hset(_otp_key(email), "used", 1)


def invalidate(email: str) -> None:
    get_redis().delete(_otp_key(email))


# ------------------------------------------------------------------
# Pre-registration phone OTP (7-tab provider registration wizard,
# Tab 2 "Mobile Number (OTP Verification)"). Deliberately separate
# key namespace from the functions above - those are keyed by email
# and require an existing User row (used for post-signup OTP login),
# while these are keyed by the raw phone number and run before any
# User exists at all.
# ------------------------------------------------------------------


def _registration_otp_key(phone: str) -> str:
    return f"otp:register:{phone.strip()}"


def _registration_cooldown_key(phone: str) -> str:
    return f"otp_cooldown:register:{phone.strip()}"


def check_and_set_registration_cooldown(phone: str) -> bool:
    r = get_redis()
    return bool(
        r.set(
            _registration_cooldown_key(phone),
            "1",
            nx=True,
            ex=OTP_RESEND_COOLDOWN_SECONDS,
        )
    )


def save_registration_otp(phone: str, otp_code: str) -> None:
    r = get_redis()
    key = _registration_otp_key(phone)

    r.hset(
        key,
        mapping={"code": otp_code, "attempts": 0, "verified": 0},
    )
    r.expire(key, OTP_TTL_SECONDS)


def get_registration_otp(phone: str) -> "dict | None":
    r = get_redis()
    data = r.hgetall(_registration_otp_key(phone))
    return data or None


def increment_registration_attempt(phone: str) -> int:
    r = get_redis()
    return r.hincrby(_registration_otp_key(phone), "attempts", 1)


def mark_registration_verified(phone: str) -> None:
    get_redis().hset(_registration_otp_key(phone), "verified", 1)


def invalidate_registration_otp(phone: str) -> None:
    get_redis().delete(_registration_otp_key(phone))


# One-time token issued after a phone number passes OTP verification,
# handed to POST /auth/register-provider to prove the phone on the
# submitted form is the one that was actually verified (rather than
# trusting a phone_verified boolean the frontend could just set on its
# own). Consumed (deleted) the moment registration succeeds.

PHONE_TOKEN_TTL_SECONDS = int(os.getenv("PHONE_TOKEN_TTL_SECONDS", "1800"))  # 30 min


def _phone_token_key(token: str) -> str:
    return f"phone_verified_token:{token}"


def save_phone_verification_token(token: str, phone: str) -> None:
    r = get_redis()
    r.set(_phone_token_key(token), phone.strip(), ex=PHONE_TOKEN_TTL_SECONDS)


def get_phone_for_verification_token(token: str) -> "str | None":
    return get_redis().get(_phone_token_key(token))


def invalidate_phone_verification_token(token: str) -> None:
    get_redis().delete(_phone_token_key(token))
