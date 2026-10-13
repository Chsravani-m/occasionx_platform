from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.db.session import get_db

from app.core.dependencies import (
    get_current_user
)
from app.core.service_auth import require_internal

from app.schemas.user import (
    UserProfileCreate,
    UserProfileUpdate,
    InternalProfileCreate
)

from app.services.user_service import (
    create_profile,
    get_my_profile,
    update_user_profile,
    delete_user_profile,
    create_empty_profile
)


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post("/internal/create-profile")
def create_empty_user_profile(
    request: InternalProfileCreate,
    db: Session = Depends(get_db),
    caller: dict = Depends(require_internal)
):
    return create_empty_profile(
        db,
        request
    )

@router.post("/profile")
def create_user_profile(
    request: UserProfileCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        get_current_user
    )
):
    try:
        return create_profile(
            db,
            current_user,
            request
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.get("/profile")
def my_profile(
    db: Session = Depends(get_db),
    current_user=Depends(
        get_current_user
    )
):
    try:
        profile = get_my_profile(
            db,
            current_user["sub"],
            current_user.get("email")
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    if not profile:
            raise HTTPException(
                status_code=404,
                detail="Profile not found"
            )

    return profile
    
@router.put("/profile")
def update_profile(
    request: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:

        profile = update_user_profile(
            db,
            current_user["sub"],
            request
        )

        return profile

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    
@router.delete("/profile")
def delete_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:

        delete_user_profile(
            db,
            current_user["sub"]
        )

        return {
            "message":
            "Profile deactivated successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )