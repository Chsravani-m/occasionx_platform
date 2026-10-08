from fastapi import Depends
from fastapi import HTTPException

from app.core.dependencies import (
    get_current_user
)


def require_role(role: str):

    def checker(
        current_user=Depends(
            get_current_user
        )
    ):

        if current_user["role"] != role:
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )

        return current_user

    return checker