from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.schemas.user import (
    UserRegister,
    UserResponse
)

from app.db.session import get_db

from app.services.auth_service import (
    login_user,
    register_user
)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)


@router.post(
    "/register",
    response_model=UserResponse
)
def register(
    request: UserRegister,
    db: Session = Depends(get_db)
):
    try:
        return register_user(
            db,
            request.email,
            request.password
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    
from app.schemas.user import UserLogin

@router.post("/login")
def login(
    request: UserLogin,
    db: Session = Depends(get_db)
):
    try:
        return login_user(
            db,
            request.email,
            request.password
        )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )
    
from app.core.dependencies import get_current_user


@router.get("/me")
def me(
    current_user=Depends(get_current_user)
):
    return current_user