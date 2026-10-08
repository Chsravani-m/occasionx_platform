from pydantic import BaseModel, EmailStr
from uuid import UUID

class ProviderRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str

    # Proof the phone above actually received and confirmed an OTP -
    # see POST /auth/verify-registration-otp, called from Tab 2 of the
    # registration wizard. Required so this endpoint can't be called
    # directly with an unverified number.
    phone_verification_token: str

    business_name: str
    owner_name: str

    # Business Location (Tab 3) and Services (Tab 4) come after
    # account creation in the 7-tab wizard now, so these are no
    # longer required up front - the account is created right after
    # Tab 2 and the remaining tabs are saved via provider-service's
    # dedicated PATCH endpoints as the provider continues the wizard.
    state_id: int | None = None
    district_id: int | None = None
    location_id: int | None = None

    category_id: UUID | None = None
    subcategory_id: UUID | None = None

    address: str | None = None
    gst_number: str | None = None
    description: str | None = None

    # --- Tab 1: Business Information ---
    legal_entity_name: str | None = None
    pan_number: str | None = None
    year_established: int | None = None
    business_registration_number: str | None = None
    entity_type: str | None = None
    logo_url: str | None = None
    cover_image_url: str | None = None
    promotional_video_url: str | None = None

    # --- Tab 2: Contact Details ---
    contact_person: str | None = None
    whatsapp_number: str | None = None
    website_url: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    youtube_url: str | None = None