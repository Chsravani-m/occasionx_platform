import os
import secrets
import random
import requests

from datetime import datetime, timedelta

# Dev-only escape hatch: set DEV_SKIP_VERIFICATION=true in
# services/auth-service/.env to skip email/mobile verification and
# the provider account-activation gate at login. Never set this in
# production - it exists purely so local testing doesn't require a
# working SMTP setup for every throwaway account.
DEV_SKIP_VERIFICATION = (
    os.getenv("DEV_SKIP_VERIFICATION", "false").lower() == "true"
)

from sqlalchemy.orm import Session

from app.db.models.role import UserRole
from app.db.models.user import User

from app.repositories.user_repository import (
    get_user_by_email,
    create_user,
    get_user_by_phone
)

from app.repositories.token_repository import (
    save_refresh_token,
    get_refresh_token
)
from app import otp_cache
from app.whatsapp_utils import send_otp_whatsapp
from app.meta_whatsapp import EXPOSE_TEST_OTP

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_onboarding_token,
    decode_token,
    generate_verification_token
)

from app.repositories.token_repository import (
    save_refresh_token,
    get_refresh_token,
    revoke_refresh_token
)
from app.repositories.password_reset_repository import (
    save_reset_token,
    get_reset_token
)
from app.email_utils import (
    send_verification_email,
    send_password_reset_email
)

PROVIDER_SERVICE_URL = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8002")

def _get_provider_for_user(user_id) -> dict | None:
    """
    Looks up the provider-service record tied to a user id, if any.
    Returns None when no Provider row exists (404) or when
    provider-service can't be reached at all - both are treated as
    "can't confirm this is safe to resume" by the one caller that uses
    this for that purpose (see _is_resumable_registration below), so
    silently returning None there keeps the existing hard-block
    behaviour rather than risking a wrong resume decision.
    """
    try:
        response = requests.get(
            f"{PROVIDER_SERVICE_URL}/providers/user/{user_id}",
            timeout=5
        )

        if response.status_code == 200:
            return response.json()

        return None

    except Exception as e:
        print("PROVIDER LOOKUP FAILED:", str(e))
        return None


def _is_resumable_registration(user_id) -> dict | None:
    """
    A registration is resumable when the phone/email already belongs
    to a PROVIDER account that was created (Tab 1+2 submitted) but
    never finished (registration fee unpaid and account not yet
    activated) - i.e. the person closed the tab or lost their session
    partway through Tabs 3-7 and is now trying to pick it back up.
    Returns the provider dict when that's the case, otherwise None
    (either no provider row at all, or a fully completed one - both
    keep the original "already exists" block).
    """
    provider = _get_provider_for_user(user_id)

    if not provider:
        return None

    if provider.get("registration_fee_paid") or provider.get(
        "account_activated"
    ):
        return None

    return provider


def register_user(
    db: Session,
    full_name: str,
    phone: str,
    email: str,
    password: str,
    role: UserRole = UserRole.CUSTOMER
):

    verification_token = generate_verification_token()

    existing_user = get_user_by_email(
        db,
        email
    )
    if role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise Exception(
            "Admin registration not allowed"
        )
    # Providers must sign up through /auth/register-provider, which also
    # creates their provider record and collects the registration fee.
    if role == UserRole.PROVIDER:
        raise Exception(
            "Please use the provider registration form to sign up as a "
            "service provider."
        )
    if existing_user:
        raise Exception(
            "An account with this email already exists. Please sign "
            "in or use a different email."
        )

    digits_only = "".join(ch for ch in phone if ch.isdigit())

    # Allow an optional "91" country code prefix (with or without a
    # leading +, since the frontend strips the + before sending).
    if len(digits_only) == 12 and digits_only.startswith("91"):
        digits_only = digits_only[2:]

    if len(digits_only) != 10:
        raise Exception(
            "Please enter a valid 10-digit mobile number."
        )

    phone = digits_only

    if get_user_by_phone(db, phone):
        raise Exception(
            "An account with this mobile number already exists. "
            "Please sign in or use a different number."
        )

    hashed_password = hash_password(
        password
    )

    user = create_user(
        db=db,
        full_name=full_name,
        phone=phone,
        email=email,
        password_hash=hashed_password,
        role=role,
        email_verification_token=verification_token
    )

    # Best-effort - see app/email_utils.py. The account already exists
    # by this point regardless of whether the email send succeeds; on
    # failure it logs the verification link to the console so it can
    # still be handed to the customer manually.
    send_verification_email(
        to_email=user.email,
        full_name=user.full_name,
        token=verification_token,
    )

    try:
        # Best-effort: if user-service is down or this call otherwise
        # fails, registration still succeeds - GET /users/profile on
        # user-service self-heals by creating a minimal profile row
        # on first view, so this is intentionally non-fatal.
        response = requests.post(
            f"{USER_SERVICE_URL}/api/v1/users/internal/create-profile",
            json={
                "user_id": str(user.id),
                "email": user.email,
                "full_name": user.full_name
            },
            timeout=5
        )

        if response.status_code >= 400:
            print(
                "PROFILE SERVICE RETURNED ERROR:",
                response.status_code,
                response.text
            )
        else:
            print(
                "PROFILE SERVICE RESPONSE:",
                response.status_code,
                response.text
            )

    except Exception as e:
        print(
            "PROFILE CREATION FAILED:",
            str(e)
        )

    return user

def register_provider(
    db,
    request
):
    # Confirm the submitted phone is the one that actually completed
    # OTP verification in Tab 2 - see
    # POST /auth/verify-registration-otp / otp_cache.py's
    # save_phone_verification_token(). Without this, this endpoint
    # would happily create an account for any phone number typed into
    # the form, verified or not.
    normalized_phone = _normalize_registration_phone(request.phone)

    verified_phone = otp_cache.get_phone_for_verification_token(
        request.phone_verification_token
    )

    if not verified_phone or verified_phone != normalized_phone:
        raise Exception(
            "Mobile number is not verified. Please verify your "
            "mobile number again."
        )

    existing_by_email = get_user_by_email(db, request.email)
    existing_by_phone = get_user_by_phone(db, normalized_phone)

    # Resuming an abandoned registration: only safe when the email
    # and phone both already point at the exact same account (proven
    # to be theirs via the OTP check above) AND that account's
    # provider profile was never finished. Anything else - a brand
    # new phone/email, or either one belonging to someone else's
    # account - keeps the original hard block.
    resuming_provider = None

    if existing_by_email or existing_by_phone:
        same_account = (
            existing_by_email
            and existing_by_phone
            and existing_by_email.id == existing_by_phone.id
        )

        if same_account:
            resuming_provider = _is_resumable_registration(
                existing_by_email.id
            )

        if not resuming_provider:
            if existing_by_email:
                raise Exception("Email already exists")

            raise Exception(
                "An account with this mobile number already exists. "
                "Please sign in or use a different number."
            )

    if resuming_provider:
        user = existing_by_email

        # They've just re-proven ownership of this phone number via
        # OTP, so it's safe to refresh their name/password in case
        # they forgot the original one - this is a continuation of
        # the same account, not a new one.
        user.full_name = request.full_name
        user.password_hash = hash_password(request.password)
        user.is_verified = True
        user.is_phone_verified = True

        db.commit()
        db.refresh(user)
        print("RESUMING EXISTING USER:", user.id)

    else:
        print("STEP 1: Creating user")

        user = create_user(
            db=db,
            full_name=request.full_name,
            phone=normalized_phone,
            email=request.email,
            password_hash=hash_password(
                request.password
            ),
            role=UserRole.PROVIDER
        )
        user.is_verified = True
        user.is_phone_verified = True

        db.commit()
        db.refresh(user)
        print("USER CREATED:", user.id)

    # One-time token, consumed now that it's done its job.
    otp_cache.invalidate_phone_verification_token(
        request.phone_verification_token
    )

    try:
        print("STEP 2: Calling user-service")

        profile_response = requests.post(
            f"{USER_SERVICE_URL}/api/v1/users/internal/create-profile",
            json={
                "user_id": str(user.id),
                "email": user.email,
                "full_name": user.full_name
            },
            timeout=5
        )

        if profile_response.status_code >= 400:
            # Not raised: GET /users/profile self-heals by creating a
            # minimal profile row on first view if this one never got
            # created, so provider registration can still proceed.
            print(
                "PROFILE RESPONSE RETURNED ERROR:",
                profile_response.status_code,
                profile_response.text
            )
        else:
            print(
                "PROFILE RESPONSE:",
                profile_response.status_code,
                profile_response.text
            )

    except Exception as e:
        print(
            "PROFILE SERVICE FAILED:",
            str(e)
        )
        raise Exception(
            f"Profile service error: {str(e)}"
        )

    try:
        print("STEP 3: Calling provider-service")

        # Shared Tab 1 + Tab 2 fields. When resuming, these go through
        # PUT (update the existing provider row we already found) so
        # the account isn't duplicated; a fresh registration POSTs a
        # brand new provider row.
        provider_fields = {
            "business_name": request.business_name,
            "owner_name": request.owner_name,
            "state_id": request.state_id,
            "district_id": request.district_id,
            "location_id": request.location_id,
            "address": request.address,
            "gst_number": request.gst_number,
            "description": request.description,

            # Tab 1: Business Information
            "legal_entity_name": request.legal_entity_name,
            "pan_number": request.pan_number,
            "year_established": request.year_established,
            "business_registration_number":
                request.business_registration_number,
            "entity_type": request.entity_type,

            # Tab 2: Contact Details
            "contact_person": request.contact_person,
            "whatsapp_number": request.whatsapp_number,
            "website_url": request.website_url,
            "facebook_url": request.facebook_url,
            "instagram_url": request.instagram_url,
            "youtube_url": request.youtube_url,
        }

        if resuming_provider:
            provider_fields["phone"] = normalized_phone

            provider_response = requests.put(
                f"{PROVIDER_SERVICE_URL}/providers/"
                f"{resuming_provider['id']}",
                json=provider_fields,
                timeout=5
            )
        else:
            provider_response = requests.post(
                f"{PROVIDER_SERVICE_URL}/providers",
                json={
                    **provider_fields,
                    "user_id": str(user.id),
                    "email": request.email,
                    "phone": normalized_phone,
                    "category_id": (
                        str(request.category_id)
                        if request.category_id else None
                    ),
                    "subcategory_id": (
                        str(request.subcategory_id)
                        if request.subcategory_id else None
                    ),
                    "logo_url": request.logo_url,
                    "cover_image_url": request.cover_image_url,
                    "promotional_video_url":
                        request.promotional_video_url,
                },
                timeout=5
            )

        print(
            "LOCATION DATA:",
            request.state_id,
            request.district_id,
            request.location_id
        )
        provider_data = provider_response.json()

        print(
            "PROVIDER RESPONSE:",
            provider_response.status_code,
            provider_data
        )

        if provider_response.status_code >= 400 or "id" not in provider_data:
            raise Exception(
                f"provider-service returned {provider_response.status_code}"
            )

    except Exception as e:
        print(
            "PROVIDER SERVICE FAILED:",
            str(e)
        )
        raise Exception(
            f"Provider service error: {str(e)}"
        )

    print("STEP 4: COMPLETE")

    return {
        "message": (
            "Welcome back - continuing your existing registration."
            if resuming_provider else
            "Provider registered successfully"
        ),
        "user_id": str(user.id),
        "provider_id": provider_data["id"],
        "resuming": bool(resuming_provider),
        # Lets the registration wizard save the remaining steps and pay
        # the registration fee before the account is activated.
        "onboarding_token": create_onboarding_token(
            user.id, provider_data["id"]
        ),
    }

def login_user(
    db,
    identifier,
    password
):
    if "@" in identifier:

        user = get_user_by_email(
            db,
            identifier
        )

    else:

        user = get_user_by_phone(
            db,
            identifier
        )

    if not user:
        raise Exception(
            "Invalid credentials"
        )

    if (
        not (user.is_verified or user.is_phone_verified)
        and not DEV_SKIP_VERIFICATION
    ):
        raise Exception(
            "Please verify your email or mobile"
        )

    if not verify_password(
        password,
        user.password_hash
    ):
        raise Exception(
            "Invalid credentials"
        )

    if user.role == UserRole.PROVIDER and not DEV_SKIP_VERIFICATION:
        try:
            activation_check = requests.get(
                f"{PROVIDER_SERVICE_URL}/providers/user/{user.id}",
                timeout=5
            )

            if activation_check.status_code == 200:
                provider_data_check = activation_check.json()

                if not provider_data_check.get(
                    "account_activated"
                ):
                    raise Exception(
                        "Please activate your account using the "
                        "link we emailed you after your "
                        "registration payment before logging in."
                    )

        except Exception as e:
            # Re-raise the deliberate "not activated" message above;
            # anything else (provider-service unreachable, timeout,
            # bad response) fails open so a temporary outage there
            # doesn't lock every provider out of logging in.
            if "activate your account" in str(e):
                raise

            print(
                "Warning: provider activation check failed:",
                str(e)
            )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
    )

    refresh_token = create_refresh_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
    )

    save_refresh_token(
        db=db,
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow()
        + timedelta(days=7)
    )
    provider_id = None
    if user.role == UserRole.PROVIDER:
        try:
            provider_response = requests.get(
                f"{PROVIDER_SERVICE_URL}/providers/user/{user.id}",
                timeout=5
            )

            if provider_response.status_code == 200:
                provider_id = provider_response.json()["id"]

        except Exception as e:
            print(
                "FAILED TO FETCH PROVIDER:",
                str(e)
            )

    return {
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "provider_id": provider_id,
        "user": {
        "id": str(user.id),
        "fullName": user.full_name,
        "email": user.email,
        "mobile": user.phone,
        "role": user.role.value,
        "isPaidMember": bool(user.is_paid_member)
    }
    }

def refresh_user_token(
    db: Session,
    refresh_token: str
):
    token_record = get_refresh_token(
        db,
        refresh_token
    )

    if not token_record:
        raise Exception(
            "Invalid refresh token"
        )

    if token_record.revoked:
        raise Exception(
            "Refresh token revoked"
        )

    payload = decode_token(
        refresh_token
    )

    if not payload:
        raise Exception(
            "Refresh token expired"
        )

    user = (
        db.query(User)
        .filter(
            User.id == payload["sub"]
        )
        .first()
    )

    if not user:
        raise Exception(
            "User not found"
        )

    # Revoke old refresh token
    revoke_refresh_token(
        db,
        refresh_token
    )

    # Create new access token
    access_token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
    )

    # Create new refresh token
    new_refresh_token = create_refresh_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
    )

    # Save new refresh token
    save_refresh_token(
        db=db,
        user_id=user.id,
        token=new_refresh_token,
        expires_at=datetime.utcnow()
        + timedelta(days=7)
    )

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

def logout_user(
    db,
    refresh_token: str
):
    token = revoke_refresh_token(
        db,
        refresh_token
    )

    if not token:
        raise Exception(
            "Invalid refresh token"
        )

    return {
        "message": "Logged out successfully"
    }

def forgot_password(
    db,
    email: str
):
    user = get_user_by_email(
        db,
        email
    )

    if not user:
        return {
            "message":
            "If account exists, reset email sent"
        }

    token = secrets.token_urlsafe(32)

    save_reset_token(
        db=db,
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow()
        + timedelta(hours=1)
    )

    send_password_reset_email(
        user.email,
        token
    )

    return {
        "message":
        "If an account exists for that email, a password reset "
        "link has been sent."
    }

def reset_password(
    db,
    token: str,
    new_password: str
):
    reset_token = get_reset_token(
        db,
        token
    )

    if not reset_token:
        raise Exception(
            "Invalid token"
        )

    if reset_token.used:
        raise Exception(
            "Token already used"
        )

    if reset_token.expires_at < datetime.utcnow():
        raise Exception(
            "Token expired"
        )

    user = (
        db.query(User)
        .filter(
            User.id == reset_token.user_id
        )
        .first()
    )

    if not user:
        raise Exception(
            "User not found"
        )

    user.password_hash = hash_password(
        new_password
    )

    reset_token.used = True

    db.commit()

    return {
        "message":
        "Password reset successful"
    }

def verify_email(
    db,
    token
):
    user = (
        db.query(User)
        .filter(
            User.email_verification_token
            == token
        )
        .first()
    )

    if not user:
        raise Exception(
            "Invalid token"
        )

    user.is_verified = True
    user.email_verification_token = None
    user.email_verified_at = datetime.utcnow()

    db.commit()

    return {
        "message":
        "Email verified successfully"
    }

def _issue_otp(db, email: str) -> str:
    """
    Shared by send_otp/resend_otp: looks up the user, enforces the
    resend cooldown, generates a fresh code, stores it in Redis (see
    app/otp_cache.py - no DB row involved any more), and delivers it
    over WhatsApp. Returns the raw code only so the caller can decide
    whether/how to surface it as a fallback; nothing here logs it
    unconditionally, since that would defeat the point of sending it
    over WhatsApp in the first place.
    """
    user = get_user_by_email(
        db,
        email
    )

    if not user:
        raise Exception(
            "User not found"
        )

    if not otp_cache.check_and_set_cooldown(email):
        raise Exception(
            "Please wait a moment before requesting another OTP"
        )

    otp_code = str(
        random.randint(
            100000,
            999999
        )
    )

    otp_cache.save_otp(email, otp_code)

    sent = send_otp_whatsapp(user.phone, otp_code)

    if not sent:
        # Best-effort fallback so OTP login still works end-to-end
        # while WhatsApp isn't fully configured yet (no access token,
        # or the template hasn't been approved) - never block login on
        # a notification failure. Only reaches the console when
        # delivery genuinely failed, not on every send.
        print(
            f"WhatsApp delivery failed/not configured - OTP for "
            f"{email} ({user.phone}): {otp_code}"
        )

    return otp_code

def send_otp(
    db,
    email: str
):
    otp_code = _issue_otp(db, email)

    response = {
        "message":
        "OTP sent successfully"
    }

    # WHATSAPP_TEST_MODE means nothing was actually delivered - the
    # code only ever reached this service's own console (see
    # meta_whatsapp.py's test-mode branch). Handing it back in the
    # response too means a developer testing through the browser can
    # see/use it without needing access to that console.
    if EXPOSE_TEST_OTP:
        response["test_otp"] = otp_code

    return response

def verify_otp(
    db,
    email,
    otp_code
):
    otp = otp_cache.get_otp(email)

    if not otp:
        raise Exception(
            "OTP not found or expired"
        )

    if otp.get("used") == "1":
        raise Exception(
            "OTP already used"
        )

    if int(otp.get("attempts", 0)) >= otp_cache.OTP_MAX_ATTEMPTS:
        raise Exception(
            "Maximum OTP attempts exceeded"
        )

    # Wrong OTP
    if otp.get("code") != otp_code:

        otp_cache.increment_attempt(email)

        raise Exception(
            "Invalid OTP"
        )

    otp_cache.mark_verified(email)

    user = get_user_by_email(db, email)

    if user:
        user.is_phone_verified = True
        db.commit()

    return {
        "message":
        "OTP verified successfully"
    }

def otp_login(
    db,
    email: str,
    otp_code: str
):
    otp = otp_cache.get_otp(email)

    if not otp:
        raise Exception(
            "Invalid OTP"
        )
    if otp.get("code") != otp_code:
        raise Exception(
            "Invalid OTP"
        )

    if otp.get("verified") != "1":
        raise Exception(
            "OTP not verified"
        )

    if otp.get("used") == "1":
        raise Exception(
            "OTP already used"
        )

    user = get_user_by_email(
        db,
        email
    )

    if not user:
        raise Exception(
            "User not found"
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
    )

    refresh_token = create_refresh_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
    )

        # Save refresh token in DB
    save_refresh_token(
        db=db,
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow()
        + timedelta(days=7)
    )

    # Mark OTP as used
    otp_cache.mark_used(email)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

def resend_otp(
    db,
    email
):
    otp_code = _issue_otp(db, email)

    response = {
        "message":
        "OTP resent successfully"
    }

    if EXPOSE_TEST_OTP:
        response["test_otp"] = otp_code

    return response


def _normalize_registration_phone(phone: str) -> str:
    digits_only = "".join(ch for ch in (phone or "") if ch.isdigit())

    if len(digits_only) == 12 and digits_only.startswith("91"):
        digits_only = digits_only[2:]

    if len(digits_only) != 10:
        raise Exception("Please enter a valid 10-digit mobile number.")

    return digits_only


def send_registration_otp(db, phone: str):
    """
    Tab 2 of the provider registration wizard - "Mobile Number (OTP
    Verification)". Unlike send_otp() above, this runs before any
    User row exists, so it's keyed by the raw phone number instead of
    an existing account's email (see otp_cache.py's
    save_registration_otp / get_registration_otp).
    """

    phone = _normalize_registration_phone(phone)

    existing_user = get_user_by_phone(db, phone)
    resuming = False

    if existing_user:
        # Don't hard-block right away - an abandoned, never-finished
        # registration shouldn't permanently lock out its own phone
        # number. See _is_resumable_registration for exactly what
        # counts as "abandoned" vs. a genuinely existing account.
        if not _is_resumable_registration(existing_user.id):
            raise Exception(
                "An account with this mobile number already exists. "
                "Please sign in instead."
            )

        resuming = True

    if not otp_cache.check_and_set_registration_cooldown(phone):
        raise Exception(
            "Please wait a moment before requesting another OTP"
        )

    otp_code = str(random.randint(100000, 999999))

    otp_cache.save_registration_otp(phone, otp_code)

    sent = send_otp_whatsapp(phone, otp_code)

    if not sent:
        print(
            f"WhatsApp delivery failed/not configured - registration "
            f"OTP for {phone}: {otp_code}"
        )

    response = {"message": "OTP sent successfully"}

    if resuming:
        response["resuming"] = True

    # See send_otp() above for why this is safe to include - it only
    # ever fires in WHATSAPP_TEST_MODE, where no real message was sent
    # anyway.
    if EXPOSE_TEST_OTP:
        response["test_otp"] = otp_code

    return response


def verify_registration_otp(db, phone: str, otp_code: str):
    phone = _normalize_registration_phone(phone)

    otp = otp_cache.get_registration_otp(phone)

    if not otp:
        raise Exception("OTP not found or expired")

    if int(otp.get("attempts", 0)) >= otp_cache.OTP_MAX_ATTEMPTS:
        raise Exception("Maximum OTP attempts exceeded")

    if otp.get("code") != otp_code:
        otp_cache.increment_registration_attempt(phone)
        raise Exception("Invalid OTP")

    otp_cache.mark_registration_verified(phone)
    otp_cache.invalidate_registration_otp(phone)

    token = secrets.token_urlsafe(32)

    otp_cache.save_phone_verification_token(token, phone)

    return {
        "message": "Mobile number verified successfully",
        "phone_verification_token": token,
    }