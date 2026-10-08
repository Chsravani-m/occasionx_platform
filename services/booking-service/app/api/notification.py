from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.notification import (
    NotificationResponse,
    UnreadCountResponse
)

from app.crud.notification import (
    get_user_notifications,
    get_unread_count,
    mark_all_read,
    mark_read
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get(
    "/user/{user_id}",
    response_model=list[
        NotificationResponse
    ]
)
def list_notifications(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    return get_user_notifications(
        db,
        user_id
    )


@router.get(
    "/user/{user_id}/unread-count",
    response_model=UnreadCountResponse
)
def unread_count(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    return {
        "unread_count": get_unread_count(
            db,
            user_id
        )
    }


@router.patch(
    "/user/{user_id}/read-all"
)
def read_all(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    mark_all_read(
        db,
        user_id
    )

    return {
        "message": "All notifications marked as read"
    }


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse
)
def read_one(
    notification_id: UUID,
    db: Session = Depends(get_db)
):
    notification = mark_read(
        db,
        notification_id
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return notification
