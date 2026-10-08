"""
Real Meta WhatsApp Cloud API client.

Business-initiated messages (booking-status pings sent to a customer
or provider who hasn't just messaged us) can NOT be arbitrary freeform
text - Meta requires every such message to use a pre-approved message
*template*. Submit and approve templates in Meta Business Manager
(WhatsApp Manager > Message Templates) before flipping
WHATSAPP_TEST_MODE off; the template name/language here must match
exactly what you registered there. Booking-status messages belong in
the UTILITY category (order/booking confirmations, not promotional).

Configure via a .env file in services/booking-service/:

    WHATSAPP_TEST_MODE=true
    WHATSAPP_ACCESS_TOKEN=
    WHATSAPP_PHONE_NUMBER_ID=
    WHATSAPP_API_VERSION=v21.0
    WHATSAPP_DEFAULT_COUNTRY_CODE=91

While WHATSAPP_TEST_MODE=true (the default), sends are only printed to
the console - nothing is billed and nothing needs to be approved yet.
Flip it to false once you have a real access token, phone_number_id,
and approved templates (see app/whatsapp_utils.py for the specific
templates this service sends).

Sending is treated as best-effort / non-fatal - see send_whatsapp_template().

Note: this is the same client as auth-service's app/meta_whatsapp.py,
duplicated rather than shared - there's no shared package between
services in this repo yet, and it's a thin enough wrapper that keeping
one copy per service is simpler than standing up one for a single file.
"""

import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()

WHATSAPP_TEST_MODE = os.getenv("WHATSAPP_TEST_MODE", "true") == "true"
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v21.0")
WHATSAPP_DEFAULT_COUNTRY_CODE = os.getenv("WHATSAPP_DEFAULT_COUNTRY_CODE", "91")

GRAPH_API_BASE = "https://graph.facebook.com"


def format_e164(phone: str) -> str:
    """
    Meta's `to` field wants digits only, country code included, no
    leading +. Phone numbers in this app are generally stored as a
    plain 10-digit local number, so this just prepends the default
    country code unless the number already looks like it has one.
    """
    digits = re.sub(r"\D", "", phone or "")

    if not digits:
        return ""

    if len(digits) == 10:
        return f"{WHATSAPP_DEFAULT_COUNTRY_CODE}{digits}"

    return digits


def send_whatsapp_template(
    to_phone: str,
    template_name: str,
    language_code: str,
    body_params: "list[str] | None" = None,
    button_param: "str | None" = None,
) -> bool:
    """
    Sends one pre-approved WhatsApp template message via Meta's Cloud
    API. Never raises - returns True/False so callers can log the
    failure but always continue (a payment has already succeeded by
    the time this is called, so a WhatsApp outage or an unapproved
    template should never fail the booking).
    """
    to = format_e164(to_phone)

    if not to:
        print(
            "Warning: skipped WhatsApp send - no phone number on file "
            f"for template '{template_name}'"
        )
        return False

    components = []

    if body_params:
        components.append(
            {
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in body_params],
            }
        )

    if button_param is not None:
        components.append(
            {
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [{"type": "text", "text": str(button_param)}],
            }
        )

    template_payload = {"name": template_name, "language": {"code": language_code}}
    if components:
        template_payload["components"] = components

    if WHATSAPP_TEST_MODE:
        print(
            f"[WhatsApp TEST MODE] Would send template '{template_name}' "
            f"({language_code}) to {to}: {components}"
        )
        return True

    if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        print(
            "Warning: WHATSAPP_TEST_MODE is off but WHATSAPP_ACCESS_TOKEN/"
            "WHATSAPP_PHONE_NUMBER_ID are not configured in .env - message "
            f"NOT sent to {to} (template '{template_name}')"
        )
        return False

    url = (
        f"{GRAPH_API_BASE}/{WHATSAPP_API_VERSION}/"
        f"{WHATSAPP_PHONE_NUMBER_ID}/messages"
    )
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": template_payload,
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code >= 400:
            print(
                f"Warning: WhatsApp send failed ({response.status_code}) "
                f"to {to}, template '{template_name}': {response.text}"
            )
            return False

        return True

    except Exception as e:
        print(
            f"Warning: WhatsApp send raised an exception for {to}, "
            f"template '{template_name}': {e}"
        )
        return False
