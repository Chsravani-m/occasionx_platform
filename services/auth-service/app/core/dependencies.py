from fastapi import Depends
from fastapi import HTTPException
from fastapi.security import HTTPBearer
from fastapi.security import HTTPAuthorizationCredentials

from app.core.security import decode_token

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    return payload

def require_role(role):

    def checker(current_user=Depends(get_current_user)):

        if current_user["role"] != role:
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )

        return current_user

    return checker