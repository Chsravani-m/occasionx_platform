"""
Dev/test-mode helper: deletes a user_profiles row by email from
user-service, so that email can be used to register again.

email is a unique column on UserProfile (see db/models/user.py), so a
leftover profile row - e.g. from earlier testing, or left behind
after deleting the matching row in auth-service's own users table -
would make the self-healing GET /users/profile fail with a unique
constraint violation the next time someone registers with that email
and a profile gets auto-created for their new user_id.

This only touches user-service's own user_profiles table. Run
alongside auth-service's delete_user_by_email.py, which removes the
row that's actually blocking /auth/register.

Usage, from inside services/user-service (so its own .env/venv is
active):

    python -m app.delete_profile_by_email someone@example.com
"""

import sys

from app.db.database import SessionLocal
from app.db.models.user import UserProfile


def main():
    if len(sys.argv) != 2:
        print("Usage: python -m app.delete_profile_by_email <email>")
        return

    email = sys.argv[1]

    db = SessionLocal()

    try:
        profile = (
            db.query(UserProfile)
            .filter(UserProfile.email == email)
            .first()
        )

        if not profile:
            print(f"No profile found with email {email} - nothing to do.")
            return

        print(
            f"Deleting profile: {profile.first_name} {profile.last_name} "
            f"<{profile.email}> (user_id={profile.user_id})"
        )

        db.delete(profile)
        db.commit()

        print("Done.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
