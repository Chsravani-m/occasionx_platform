from pydantic import BaseModel
from typing import Optional


class UserProfileCreate(BaseModel):
    first_name: str
    last_name: str
    
    phone: str

    address: Optional[str] = None

    city: Optional[str] = None

    state: Optional[str] = None

    country: Optional[str] = None

    pincode: Optional[str] = None

    bio: Optional[str] = None

    profile_image_url: Optional[str] = None

class UserProfileUpdate(BaseModel):

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None

    bio: Optional[str] = None

    profile_image_url: Optional[str] = None

class InternalProfileCreate(BaseModel):
    user_id: str
    email: str
    full_name: str