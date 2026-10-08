from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    role: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminUpdateRole(BaseModel):
    role: str

class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True
