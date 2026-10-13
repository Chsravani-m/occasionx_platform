"""
Real Meta WhatsApp Cloud API client.

Business-initiated messages (this service only ever sends OTPs, which
are always business-initiated) can NOT be arbitrary freeform text -
Meta requires every such message to use a pre-approved message
*template*. Submit and approve templates in Meta Business Manager
(WhatsApp Manager > Message Templates) before flipping
WHATSAPP_TEST_MODE off; the template name/language here must match
exactly what you registered there.

For OTP specifically, use Meta's AUTHENTICATION category - it has a
fast-track review (often auto-approved) and a built-in "Copy Code"
button. Its component shape is fixed by Meta: a body parameter with
the code, and (if you enabled the copy-code button when creating the
template) a button parameter with the same code.

Configure via a .env file in services/auth-service/:

    WHATSAPP_TEST_MODE=true
    WHATSAPP_ACCESS_TOKEN=
    WHATSAPP_PHONE_NUMBER_ID=
    WHATSAPP_API_VERSION=v21.0
    WHATSAPP_DEFAULT_COUNTRY_CODE=91

While WHATSAPP_TEST_MODE=true (the default, and Meta's own free test
number works fine here too), sends are only printed to the console -
nothing is billed and nothing needs to be approved yet. Flip it to
false once you have a real access token, phone_number_id, and an
approved template.

Sending is treated as best-effort / non-fatal - see send_whatsapp_template().
"""

import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()

WHATSAPP_TEST_MODE = os.getenv("WHATSAPP_TEST_MODE", "true") == "true"

# Returning the OTP in the API response lets developers test without
# WhatsApp, but it means anyone can log in as anyone. Never allowed in
# production (APP_ENV=production, set by docker-compose.yml), even if
# WHATSAPP_TEST_MODE is accidentally left on - codes are then simply
# not delivered until the Meta credentials are configured.
IS_PRODUCTION = os.getenv("APP_ENV", "").lower() == "production"
EXPOSE_TEST_OTP = WHATSAPP_TEST_MODE and not IS_PRODUCTION

if WHATSAPP_TEST_MODE and IS_PRODUCTION:
    print(
        "WARNING: WHATSAPP_TEST_MODE=true in production - WhatsApp OTP "
        "codes are NOT being delivered. Set WHATSAPP_TEST_MODE=false and "
        "WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID."
    )
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v21.0")
WHATSAPP_DEFAULT_COUNTRY_CODE = os.getenv("WHATSAPP_DEFAULT_COUNTRY_CODE", "91")

GRAPH_API_BASE = "https://graph.facebook.com"


def format_e164(phone: str) -> str:
    """
    Meta's `to` field wants digits only, country code included, no
    leading +. Every phone number in this app is stored as a plain
    10-digit local number (see register_user()'s digits_only logic in
    auth_service.py), so this just prepends the default country code
    unless the number already looks like it has one attached.
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
    failure but always continue (a WhatsApp outage or an unapproved
    template should never block login/registration/booking flows that
    have already succeeded by the time this is called).
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
