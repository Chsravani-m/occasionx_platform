"""
WhatsApp notifications for booking confirmations - the two functions
crud/booking.py's confirm_booking_payment() calls.

Wraps app/meta_whatsapp.py's generic template sender with the two
UTILITY-category templates this service needs: one for the customer,
one for the provider. Configure via a .env file in
services/booking-service/:

    WHATSAPP_BOOKING_CUSTOMER_TEMPLATE_NAME=booking_confirmed_customer
    WHATSAPP_BOOKING_PROVIDER_TEMPLATE_NAME=booking_confirmed_provider
    WHATSAPP_BOOKING_TEMPLATE_LANG=en_US

These must match the name/language of approved UTILITY templates in
Meta Business Manager exactly - the names above are just this
codebase's placeholder defaults until you've registered real ones.
Both templates are assumed to take their variables in the order built
below (see the *_params lists) - reorder the {{1}}, {{2}}, ... slots
in Meta Business Manager to match, or reorder the lists here to match
whatever you actually registered.

Sending is treated as best-effort / non-fatal: the booking payment has
already succeeded by the time this is called, so a misconfigured or
unreachable WhatsApp provider should never fail the payment API call.
"""

import os

from dotenv import load_dotenv

from app.meta_whatsapp import send_whatsapp_template

load_dotenv()

WHATSAPP_BOOKING_CUSTOMER_TEMPLATE_NAME = os.getenv(
    "WHATSAPP_BOOKING_CUSTOMER_TEMPLATE_NAME", "booking_confirmed_customer"
)
WHATSAPP_BOOKING_PROVIDER_TEMPLATE_NAME = os.getenv(
    "WHATSAPP_BOOKING_PROVIDER_TEMPLATE_NAME", "booking_confirmed_provider"
)
WHATSAPP_BOOKING_TEMPLATE_LANG = os.getenv("WHATSAPP_BOOKING_TEMPLATE_LANG", "en_US")


def send_booking_confirmation_customer_whatsapp(
    customer_phone: str,
    customer_name: str,
    provider_name: str,
    provider_phone: str,
    event_date,
    amount,
) -> bool:
    """
    Body params, in order: customer name, provider name, event date,
    amount paid, provider contact number.
    """
    return send_whatsapp_template(
        to_phone=customer_phone,
        template_name=WHATSAPP_BOOKING_CUSTOMER_TEMPLATE_NAME,
        language_code=WHATSAPP_BOOKING_TEMPLATE_LANG,
        body_params=[
            customer_name or "there",
            provider_name or "your provider",
            str(event_date),
            f"₹{amount}",
            provider_phone or "not available",
        ],
    )


def send_booking_confirmation_provider_whatsapp(
    provider_phone: str,
    provider_name: str,
    customer_name: str,
    customer_phone: str,
    event_date,
) -> bool:
    """
    Body params, in order: provider name, customer name, event date,
    customer contact number.
    """
    return send_whatsapp_template(
        to_phone=provider_phone,
        template_name=WHATSAPP_BOOKING_PROVIDER_TEMPLATE_NAME,
        language_code=WHATSAPP_BOOKING_TEMPLATE_LANG,
        body_params=[
            provider_name or "there",
            customer_name or "A customer",
            str(event_date),
            customer_phone or "not available",
        ],
    )
