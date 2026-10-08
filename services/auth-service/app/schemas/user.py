from typing import List
from pydantic import BaseModel
from pydantic import EmailStr
from app.db.models.role import UserRole

class UserRegister(BaseModel):

    full_name: str

    phone: str

    email: EmailStr

    password: str

    role: UserRole = UserRole.CUSTOMER

class UserLogin(BaseModel):
    identifier: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    role: UserRole

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str