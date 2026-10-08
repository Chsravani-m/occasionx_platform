from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.db.session import get_db

from app.core.rbac import (
    require_role
)

from app.schemas.admin import (
    AdminCreate,
    AdminUpdateRole,
    AdminUserResponse
)

from app.services.admin_service import (
    create_admin,
    list_users,
    get_user,
    activate_user,
    deactivate_user,
    update_user_role,
    delete_user_by_email
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

@router.post("/create-admin")
def create_admin_user(
    request: AdminCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return create_admin(
        db,
        request.email,
        request.password,
        request.role
    )

@router.get("/users")
def users(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return list_users(db)

@router.get("/users/{user_id}")
def user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return get_user(
        db,
        user_id
    )

@router.put(
    "/users/{user_id}/activate"
)
def activate(
    user_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return activate_user(
        db,
        user_id
    )

@router.put(
    "/users/{user_id}/deactivate"
)
def deactivate(
    user_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return deactivate_user(
        db,
        user_id
    )

@router.get(
    "/debug/test-smtp"
)
def debug_test_smtp(
    current_user=Depends(
        require_role("ADMIN")
    )
):
    from app.email_utils import test_smtp_connection

    return test_smtp_connection()

@router.get(
    "/debug/send-test-email"
)
def debug_send_test_email(
    to: str,
    current_user=Depends(
        require_role("ADMIN")
    )
):
    from app.email_utils import send_verification_email

    sent = send_verification_email(
        to_email=to,
        full_name="Debug Test",
        token="debug-test-token",
    )

    return {"sent": sent}

@router.delete(
    "/users/by-email/{email}"
)
def delete_user(
    email: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    try:
        delete_user_by_email(
            db,
            email
        )

        return {
            "message": f"Deleted user {email}"
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@router.put(
    "/users/{user_id}/role"
)
def change_role(
    user_id: str,
    request: AdminUpdateRole,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return update_user_role(
        db,
        user_id,
        request.role
    )

@router.get(
    "/users",
    response_model=list[AdminUserResponse]
)
def users(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return list_users(db)

@router.get(
    "/users/{user_id}",
    response_model=AdminUserResponse
)
def user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return get_user(
        db,
        user_id
    )
@router.put(
    "/users/{user_id}/activate",
    response_model=AdminUserResponse
)
def activate(
    user_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("ADMIN")
    )
):
    return activate_user(
        db,
        user_id
    )