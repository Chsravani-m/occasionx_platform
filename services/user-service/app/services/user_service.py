from app.db.models.user import UserProfile
from sqlalchemy.orm import Session

from app.repositories.user_repository import (
    get_profile_by_user_id,
    get_profile_by_email,
    save_profile,
    update_profile,
    deactivate_profile
)
from app.schemas.user import (
    UserProfileCreate,
    InternalProfileCreate
)

def create_empty_profile(
    db,
    request: InternalProfileCreate
):
    existing = get_profile_by_user_id(
        db,
        request.user_id
    )

    if existing:
        return existing

    # An orphaned profile can be left behind with this same email if the
    # matching auth-service user row was deleted and re-registered under
    # a new user_id (email is unique on UserProfile, so a plain insert
    # would hit a UniqueViolation here). Re-parent it to the new
    # user_id instead of creating a duplicate.
    orphaned = get_profile_by_email(
        db,
        request.email
    )

    if orphaned:
        orphaned.user_id = request.user_id

        return save_profile(
            db,
            orphaned
        )

    names = request.full_name.split(" ", 1)

    first_name = names[0]

    last_name = (
        names[1]
        if len(names) > 1
        else ""
    )

    profile = UserProfile(
        user_id=request.user_id,
        email=request.email,
        first_name=first_name,
        last_name=last_name,
        phone="",
        address="",
        city="",
        state="",
        country="",
        pincode="",
        bio=""
    )

    return save_profile(
        db,
        profile
    )

def create_profile(
    db: Session,
    current_user: dict,
    request: UserProfileCreate
):
    existing = get_profile_by_user_id(
        db,
        current_user["sub"]
    )

    if existing:
        raise Exception(
            "Profile already exists"
        )

    profile = UserProfile(
        user_id=current_user["sub"],
        email=current_user["email"],
        first_name=request.first_name,
        last_name=request.last_name,
        phone=request.phone,
        address=request.address,
        city=request.city,
        state=request.state,
        country=request.country,
        pincode=request.pincode,
        bio=request.bio,
        profile_image_url=request.profile_image_url
    )

    return save_profile(
        db,
        profile
    )


def get_my_profile(
    db,
    user_id,
    email=None
):
    profile = get_profile_by_user_id(
        db,
        user_id
    )

    if profile:
        return profile

    if not email:
        return None

    # An orphaned profile can exist under this email from a previously
    # deleted+re-registered account (email is unique on UserProfile).
    # Re-parent it to the current user_id rather than inserting a
    # duplicate, which would crash with a UniqueViolation.
    orphaned = get_profile_by_email(
        db,
        email
    )

    if orphaned:
        orphaned.user_id = user_id

        return save_profile(
            db,
            orphaned
        )

    # Self-heal: profile rows are normally created by a fire-and-forget
    # call from auth-service at registration time, which can silently
    # fail (or, for admin accounts, is never called at all). Rather than
    # leaving the account permanently 404ing on its own profile page,
    # create a minimal one on first view - the user can fill it in.
    profile = UserProfile(
        user_id=user_id,
        email=email,
        first_name=email.split("@")[0],
        last_name="",
        phone="",
        address="",
        city="",
        state="",
        country="",
        pincode="",
        bio=""
    )

    return save_profile(
        db,
        profile
    )

def update_user_profile(
    db,
    user_id,
    profile_data
):
    profile = get_profile_by_user_id(
        db,
        user_id
    )

    if not profile:
        raise Exception(
            "Profile not found"
        )

    return update_profile(
        db,
        profile,
        profile_data.dict(
            exclude_unset=True
        )
    )

def delete_user_profile(
    db,
    user_id
):
    profile = get_profile_by_user_id(
        db,
        user_id
    )

    if not profile:
        raise Exception(
            "Profile not found"
        )

    return deactivate_profile(
        db,
        profile
    )