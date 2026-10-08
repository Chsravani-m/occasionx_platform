from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

from app.core.security import decode_token

security = HTTPBearer()


def get_current_user(
    token=Depends(security)
):
    payload = decode_token(
        token.credentials
    )

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return payload


def require_self_or_admin(
    resource_owner_id: str,
    current_user: dict
):
    """
    Raises 403 unless the logged-in user IS the resource owner (their
    token 'sub' matches resource_owner_id) or is an admin. Use for any
    endpoint scoped by a customer_id/user_id path param.
    """

    if current_user.get("role") in ("ADMIN", "SUPER_ADMIN"):
        return

    if current_user.get("sub") != str(resource_owner_id):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this resource"
        )
