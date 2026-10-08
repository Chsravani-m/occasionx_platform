from pydantic import BaseModel, EmailStr


class SendOTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class OTPLoginRequest(BaseModel):
    email: EmailStr
    otp: str

class ResendOTPRequest(BaseModel):
    email: EmailStr


class SendRegistrationOTPRequest(BaseModel):
    """Tab 2 of the provider registration wizard - phone OTP, sent
    before any account exists yet."""
    phone: str


class VerifyRegistrationOTPRequest(BaseModel):
    phone: str
    otp: str


class VerifyRegistrationOTPResponse(BaseModel):
    message: str
    # Handed back to POST /auth/register-provider to prove this phone
    # was actually OTP-verified in this session.
    phone_verification_token: str