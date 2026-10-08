from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.booking import Booking
from app.db.models.review import Review

from app.provider_client import submit_provider_rating


class ReviewError(Exception):
    pass


def get_review_stats(db: Session):
    total, average = (
        db.query(
            func.count(Review.id),
            func.avg(Review.rating),
        )
        .first()
    )

    return {
        "total_reviews": total or 0,
        "average_rating": round(float(average), 1) if average else 0.0,
    }


def get_booking_review(db: Session, booking_id):
    return (
        db.query(Review)
        .filter(Review.booking_id == booking_id)
        .first()
    )


def get_provider_reviews(db: Session, provider_id):
    return (
        db.query(Review)
        .filter(Review.provider_id == provider_id)
        .order_by(Review.created_at.desc())
        .all()
    )


def create_review(db: Session, payload):

    booking = (
        db.query(Booking)
        .filter(Booking.id == payload.booking_id)
        .first()
    )

    if not booking:
        raise ReviewError("Booking not found.")

    if booking.customer_id != payload.customer_id:
        raise ReviewError(
            "This booking doesn't belong to this customer."
        )

    if booking.booking_status != "CONFIRMED":
        raise ReviewError(
            "Only confirmed bookings can be rated."
        )

    # The event needs to have actually happened before a customer can
    # rate it - use the check-out date if there is one (multi-day
    # bookings), otherwise the single event date.
    last_day = booking.event_end_date or booking.event_date

    if last_day >= date.today():
        raise ReviewError(
            "This booking's event hasn't happened yet - you can rate "
            "it once it's over."
        )

    if get_booking_review(db, payload.booking_id):
        raise ReviewError(
            "This booking has already been rated."
        )

    review = Review(
        booking_id=booking.id,
        customer_id=booking.customer_id,
        provider_id=booking.provider_id,
        service_id=booking.service_id,
        rating=payload.rating,
        comment=payload.comment,
        customer_name=booking.customer_name,
        service_name=booking.service_name or booking.package_name,
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    # Non-fatal: provider-service being down shouldn't stop the
    # review itself from saving - the aggregate rating just won't
    # reflect this one until the next successful sync.
    submit_provider_rating(str(booking.provider_id), payload.rating)

    return review
