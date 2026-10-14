from fastapi import Depends
from fastapi import HTTPException

from app.core.service_auth import current_user, ADMIN_ROLES

# Kept under its old name for the existing imports; validation (and the
# rejection of refresh / onboarding tokens) lives in service_auth.
get_current_user = current_user


def require_role(role):

    def checker(current_user=Depends(get_current_user)):

        allowed = ADMIN_ROLES if role in ADMIN_ROLES else {role}

        if current_user.get("role") not in allowed:
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )

        return current_user

    return checker
