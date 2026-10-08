"""
Dev/test-mode helper: deletes a user row by email from auth-service,
so that email can be used to register again.

email is a unique, not-null column on User (see db/models/user.py),
so a leftover row - e.g. from earlier testing - makes /auth/register
fail with 400 "Email already exists" for that address forever, until
the row is removed.

This only touches auth-service's own users table. If the account was
also used to create a customer profile (user-service) or a provider
listing (provider-service), those live in separate databases and
won't be touched here - see delete_profile_by_email.py in
user-service for the matching cleanup there (needed if that email is
also stuck under user-service's own unique email constraint).

Usage, from inside services/auth-service (so its own .env/venv is
active):

    python -m app.delete_user_by_email someone@example.com
"""

import sys

from app.db.database import SessionLocal
from app.db.models.user import User
from app.db.models.refresh_token import RefreshToken
from app.db.models.password_reset import PasswordResetToken
from app.db.models.membership_payment import MembershipPayment


def main():
    if len(sys.argv) != 2:
        print("Usage: python -m app.delete_user_by_email <email>")
        return

    email = sys.argv[1]

    db = SessionLocal()

    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            print(f"No user found with email {email} - nothing to do.")
            return

        print(
            f"Deleting user: {user.full_name} <{user.email}> "
            f"(id={user.id}, role={user.role})"
        )

        # These three tables FK to users.id (ON DELETE has no cascade
        # configured), so the user row can't be deleted while any of
        # them still reference it - clear them first.
        for model, label in (
            (RefreshToken, "refresh token"),
            (PasswordResetToken, "password reset token"),
            (MembershipPayment, "membership payment"),
        ):
            count = (
                db.query(model)
                .filter(model.user_id == user.id)
                .delete()
            )

            if count:
                print(f"  - removed {count} {label}(s)")

        db.delete(user)
        db.commit()

        print("Done - that email can be used to register again.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
