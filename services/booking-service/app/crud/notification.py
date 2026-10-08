from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models.notification import Notification


def create_notification(
    db: Session,
    user_id,
    title: str,
    message: str | None = None,
    booking_id=None
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        booking_id=booking_id
    )

    db.add(notification)

    db.commit()

    db.refresh(notification)

    return notification


def get_user_notifications(
    db: Session,
    user_id: UUID,
    limit: int = 30
):
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id
        )
        .order_by(
            Notification.created_at.desc()
        )
        .limit(limit)
        .all()
    )


def get_unread_count(
    db: Session,
    user_id: UUID
) -> int:
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False)
        )
        .count()
    )


def mark_all_read(
    db: Session,
    user_id: UUID
):
    (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False)
        )
        .update(
            {"is_read": True}
        )
    )

    db.commit()


def mark_read(
    db: Session,
    notification_id: UUID
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id
        )
        .first()
    )

    if not notification:
        return None

    notification.is_read = True

    db.commit()

    db.refresh(notification)

    return notification
