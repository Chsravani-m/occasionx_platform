import redis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db

from app.schemas.user import (
    UserRegister,
    UserLogin
)
from app.schemas.provider_registration import (
    ProviderRegisterRequest
)
from app.schemas.otp import (
    SendOTPRequest,
    VerifyOTPRequest,
    OTPLoginRequest,
    ResendOTPRequest,
    SendRegistrationOTPRequest,
    VerifyRegistrationOTPRequest,
    VerifyRegistrationOTPResponse
)
from app.services.auth_service import (
    register_user,
    register_provider,
    login_user,
    refresh_user_token,
    forgot_password,
    reset_password,
    verify_email,
    send_otp,
    verify_otp,
    otp_login,
    resend_otp,
    send_registration_otp,
    verify_registration_otp
)
from app.core.dependencies import (
    get_current_user
)

from app.schemas.auth import (
    CurrentUserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.core.rbac import (
    require_role
)

from app.schemas.token import (
    RefreshTokenRequest
)

from app.schemas.auth import LogoutRequest
from app.services.auth_service import logout_user
from app.schemas.email_verification import (
    VerifyEmailRequest
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


def _otp_error_detail(e: Exception) -> str:
    """
    OTP send/verify/resend all route through Redis (see
    app/redis_client.py) - if Redis itself is unreachable, the raw
    driver exception (e.g. "Error 10061 connecting to localhost:6379.
    No connection could be made because the target machine actively
    refused it.") would otherwise be handed straight to str(e) and
    rendered verbatim in the registration UI. Redis outages should
    read like any other "try again" failure to the user, not leak
    infrastructure internals.
    """
    if isinstance(e, redis.exceptions.RedisError):
        return "Couldn't send the verification code right now. Please try again in a moment."

    return str(e)


@router.post("/register")
def register(
    request: UserRegister,
    db: Session = Depends(get_db)
):

    try:
        user = register_user(
            db=db,
            full_name=request.full_name,
            phone=request.phone,
            email=request.email,
            password=request.password,
            role=request.role
        )

        return {
            "message": "User registered successfully",
            "id": str(user.id),
            "email": user.email,
            "role": user.role.value
        }

    except Exception as e:
        print("REGISTER ERROR:", str(e))
        import traceback
        traceback.print_exc()

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@router.post("/register-provider")
def register_provider_endpoint(
    request: ProviderRegisterRequest,
    db: Session = Depends(get_db)
):
    try:
        return register_provider(
            db,
            request
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@router.post("/login")
def login(
    request: UserLogin,
    db: Session = Depends(get_db)
):
    try:
        return login_user(
            db=db,
            identifier=request.identifier,
            password=request.password
        )

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )
    
@router.get(
    "/me",
    response_model=CurrentUserResponse
)
def me(
    current_user=Depends(
        get_current_user
    )
):
    return current_user

@router.get("/admin")
def admin_dashboard(
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return {
        "message": "Welcome Admin",
        "user": current_user
    }

@router.post("/refresh")
def refresh(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    try:
        return refresh_user_token(
            db=db,
            refresh_token=request.refresh_token
        )

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )
    
@router.post("/logout")
def logout(
    request: LogoutRequest,
    db: Session = Depends(get_db)
):
    try:
        return logout_user(
            db,
            request.refresh_token
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    
@router.post("/forgot-password")
def forgot_password_endpoint(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    return forgot_password(
        db,
        request.email
    )

@router.post("/reset-password")
def reset_password_endpoint(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    return reset_password(
        db,
        request.token,
        request.new_password
    )
@router.post(
    "/verify-email"
)
def verify_email_endpoint(
    request: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    return verify_email(
        db,
        request.token
    )

@router.post("/send-otp")
def send_otp_endpoint(
    request: SendOTPRequest,
    db: Session = Depends(get_db)
):
    try:
        return send_otp(
            db,
            request.email
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=_otp_error_detail(e)
        )
    
@router.post("/verify-otp")
def verify_otp_endpoint(
    request: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    try:
        return verify_otp(
            db,
            request.email,
            request.otp
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=_otp_error_detail(e)
        )
    
@router.post("/otp-login")
def otp_login_endpoint(
    request: OTPLoginRequest,
    db: Session = Depends(get_db)
):
    try:
        return otp_login(
            db,
            request.email,
            request.otp
        )

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=_otp_error_detail(e)
        )
    
@router.post("/resend-otp")
def resend_otp_endpoint(
    request: ResendOTPRequest,
    db: Session = Depends(get_db)
):
    try:
        return resend_otp(
            db,
            request.email
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=_otp_error_detail(e)
        )


@router.post("/send-registration-otp")
def send_registration_otp_endpoint(
    request: SendRegistrationOTPRequest,
    db: Session = Depends(get_db)
):
    """
    Tab 2 of the provider registration wizard's Mobile Number field -
    sends an OTP to a phone number before any account exists yet.
    """
    try:
        return send_registration_otp(db, request.phone)

    except Exception as e:
        raise HTTPException(status_code=400, detail=_otp_error_detail(e))


@router.post(
    "/verify-registration-otp",
    response_model=VerifyRegistrationOTPResponse
)
def verify_registration_otp_endpoint(
    request: VerifyRegistrationOTPRequest,
    db: Session = Depends(get_db)
):
    try:
        return verify_registration_otp(
            db, request.phone, request.otp
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=_otp_error_detail(e))