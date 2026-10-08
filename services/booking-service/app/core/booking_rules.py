"""
Booking-notice + cancellation rules.

Booking notice used to be a platform-wide, category-tier, day-based
rule (Accommodation/Venue/Catering etc. needed 15 days' notice,
everything else 4). That's gone - each provider now sets their own
minimum notice in hours from their dashboard/app
(provider-service's Provider.booking_notice_hours, fetched here via
app/provider_client.py), checked against the real event date+time
(Booking.event_date + Booking.event_time) rather than just the
calendar date. E.g. with 6 hours' notice, a customer must book at
least 6 hours before the event's start time.

Cancellation policy is likewise now the provider's own free-text
clause (Provider.cancellation_policy), shown to the customer before
they book like a short terms-and-conditions section - it's purely
informational, not parsed/enforced here. The only system-level rule
left for cancellation is that a booking can't be cancelled once its
event has already happened.

OccasionX still only opens booking for an event 90 days out - that
part of the old rule is unchanged and applies to every booking
regardless of provider.
"""

from datetime import date, datetime, time, timedelta

# Used when a provider hasn't customized booking_notice_hours yet, or
# when provider-service can't be reached at booking-creation time.
DEFAULT_BOOKING_NOTICE_HOURS = 6

MAX_BOOKING_WINDOW_DAYS = 90


def earliest_allowed_datetime(
    notice_hours: int | None,
    now: datetime | None = None
) -> datetime:
    now = now or datetime.now()
    hours = notice_hours if notice_hours is not None else DEFAULT_BOOKING_NOTICE_HOURS
    return now + timedelta(hours=hours)


def latest_allowed_event_date(today: date | None = None) -> date:
    today = today or date.today()
    return today + timedelta(days=MAX_BOOKING_WINDOW_DAYS)


def can_cancel_booking(
    event_date: date,
    event_time: time | None,
    now: datetime | None = None
) -> bool:
    """
    The only remaining system-level cancellation rule: a booking can't
    be cancelled once its event has already started. Everything else
    (how far ahead a cancellation is expected, refund terms, etc.) is
    the provider's own stated cancellation_policy, shown to the
    customer beforehand rather than enforced here.
    """

    now = now or datetime.now()
    event_datetime = datetime.combine(event_date, event_time or time.min)
    return event_datetime > now
