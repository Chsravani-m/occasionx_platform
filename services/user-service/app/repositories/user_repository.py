from app.db.models.user import UserProfile


def get_profile_by_user_id(
    db,
    user_id
):
    return (
        db.query(UserProfile)
        .filter(
            UserProfile.user_id == user_id
        )
        .first()
    )


def get_profile_by_email(
    db,
    email
):
    return (
        db.query(UserProfile)
        .filter(
            UserProfile.email == email
        )
        .first()
    )


def save_profile(
    db,
    profile
):
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile

def update_profile(
    db,
    profile,
    data
):
    for key, value in data.items():

        if value is not None:
            setattr(
                profile,
                key,
                value
            )

    db.commit()
    db.refresh(profile)

    return profile

def deactivate_profile(
    db,
    profile
):
    profile.is_active = False

    db.commit()
    db.refresh(profile)

    return profile