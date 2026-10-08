import os
import requests

PROVIDER_SERVICE_URL = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")


def get_provider_user_id(provider_id):
    """
    Notifications are keyed by user_id (the account that logs in),
    but bookings/providers only carry provider_id (the business
    record). Look up the owning user_id from provider-service.

    Non-fatal - if it can't be found, the caller just skips whatever
    it was going to do with it.
    """

    try:
        response = requests.get(
            f"{PROVIDER_SERVICE_URL}/providers/{provider_id}",
            timeout=5,
        )

        response.raise_for_status()

        return response.json().get("user_id")

    except Exception as e:
        print(
            "Warning: failed to resolve user_id for provider "
            f"{provider_id}: {e}"
        )
        return None


def get_provider_phone(provider_id):
    """
    Used to WhatsApp/notify a provider's own phone (not the account
    login) when a booking is confirmed - e.g. "X booked your service,
    contact them at Y". Non-fatal - if it can't be found, the caller
    just skips sending that message.
    """

    try:
        response = requests.get(
            f"{PROVIDER_SERVICE_URL}/providers/{provider_id}",
            timeout=5,
        )

        response.raise_for_status()

        return response.json().get("phone")

    except Exception as e:
        print(
            "Warning: failed to resolve phone for provider "
            f"{provider_id}: {e}"
        )
        return None


def get_provider_services(provider_id):
    """
    Used to fan out an offline booking's date-block across every
    service the provider offers (there's no single service_id to
    block against, since offline bookings aren't tied to one listed
    service). Non-fatal - returns an empty list on failure, so a
    provider-service outage just means the offline booking gets saved
    without a date block instead of failing outright.
    """

    try:
        response = requests.get(
            f"{PROVIDER_SERVICE_URL}/providers/{provider_id}/services",
            timeout=5,
        )

        response.raise_for_status()

        return response.json()

    except Exception as e:
        print(
            "Warning: failed to fetch services for provider "
            f"{provider_id}: {e}"
        )
        return []


def submit_provider_rating(provider_id, rating):
    """
    Reports a newly-submitted review's rating so provider-service can
    fold it into that provider's average_rating/total_reviews - it
    owns those aggregate columns, so the recompute happens there
    rather than duplicating the math here.

    Non-fatal - if provider-service is unreachable, the review itself
    still saves in booking-service; the provider's aggregate rating
    just won't reflect it until the next successful sync.
    """

    try:
        response = requests.post(
            f"{PROVIDER_SERVICE_URL}/providers/{provider_id}/rating",
            json={"rating": rating},
            timeout=5,
        )

        response.raise_for_status()

    except Exception as e:
        print(
            "Warning: failed to sync rating to provider "
            f"{provider_id}: {e}"
        )


def get_provider_linked_account_id(provider_id):
    """
    Used when creating a booking's payment order, to decide whether
    the service-fee amount can be routed straight to the provider via
    Razorpay Route (a "transfers" entry on the order) instead of
    landing in the company's account like today. Returns None (no
    split - falls back to the current behavior) whenever the provider
    hasn't got a linked account yet, or provider-service can't be
    reached - this is never fatal to creating the payment order.
    """

    try:
        response = requests.get(
            f"{PROVIDER_SERVICE_URL}/providers/{provider_id}/linked-account-id",
            timeout=5,
        )

        response.raise_for_status()

        return response.json().get("razorpay_linked_account_id")

    except Exception as e:
        print(
            "Warning: failed to resolve linked account for provider "
            f"{provider_id}: {e}"
        )
        return None


def get_provider_booking_policy(provider_id):
    """
    Used at booking-creation time to check the customer's chosen
    event date+time against how much notice this specific provider
    requires (booking_notice_hours) - replaces the old platform-wide
    category-tier day-based rule (see app/core/booking_rules.py).
    cancellation_policy is the provider's own free-text policy, shown
    to the customer before they book.

    Non-fatal - falls back to the platform default (see
    booking_rules.DEFAULT_BOOKING_NOTICE_HOURS) if provider-service
    can't be reached, so an outage there never blocks checkout
    outright.
    """

    try:
        response = requests.get(
            f"{PROVIDER_SERVICE_URL}/providers/{provider_id}/booking-policy",
            timeout=5,
        )

        response.raise_for_status()

        return response.json()

    except Exception as e:
        print(
            "Warning: failed to fetch booking policy for provider "
            f"{provider_id}: {e}"
        )
        return None


def get_pricing_details(pricing_id):
    """
    Used to check whether a pricing tier has room-inventory
    (total_rooms) configured, so booking-service knows whether to
    apply capacity-based multi-booking logic instead of the default
    binary "first booking blocks the whole date" behavior.

    Non-fatal - returns None on failure, which callers treat the same
    as "no room inventory configured" (falls back to binary blocking).
    """

    try:
        response = requests.get(
            f"{PROVIDER_SERVICE_URL}/providers/pricing/{pricing_id}",
            timeout=5,
        )

        response.raise_for_status()

        return response.json()

    except Exception as e:
        print(
            "Warning: failed to fetch pricing details for pricing "
            f"{pricing_id}: {e}"
        )
        return None
