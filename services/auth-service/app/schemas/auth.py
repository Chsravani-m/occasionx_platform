from pydantic import BaseModel, EmailStr


class CurrentUserResponse(BaseModel):
    sub: str
    email: EmailStr
    role: str

from pydantic import BaseModel

class LogoutRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str