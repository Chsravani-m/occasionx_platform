"""
Login OTP delivery via WhatsApp - the actual send call auth_service.py
uses. Wraps app/meta_whatsapp.py's generic template sender with the
one template this service needs.

Configure via a .env file in services/auth-service/:

    WHATSAPP_OTP_TEMPLATE_NAME=otp_login
    WHATSAPP_OTP_TEMPLATE_LANG=en_US

These must match the name/language of an approved AUTHENTICATION
template in Meta Business Manager exactly - "otp_login"/"en_US" are
just this codebase's placeholder defaults until you've registered one.
See app/meta_whatsapp.py for the WHATSAPP_TEST_MODE/ACCESS_TOKEN/
PHONE_NUMBER_ID setup this ultimately depends on.
"""

import os

from dotenv import load_dotenv

from app.meta_whatsapp import send_whatsapp_template

load_dotenv()

WHATSAPP_OTP_TEMPLATE_NAME = os.getenv("WHATSAPP_OTP_TEMPLATE_NAME", "otp_login")
WHATSAPP_OTP_TEMPLATE_LANG = os.getenv("WHATSAPP_OTP_TEMPLATE_LANG", "en_US")


def send_otp_whatsapp(phone: str, otp_code: str) -> bool:
    """
    Sends the login OTP via WhatsApp using Meta's AUTHENTICATION-
    category template. Never raises - see send_whatsapp_template().
    """
    return send_whatsapp_template(
        to_phone=phone,
        template_name=WHATSAPP_OTP_TEMPLATE_NAME,
        language_code=WHATSAPP_OTP_TEMPLATE_LANG,
        body_params=[otp_code],
        button_param=otp_code,
    )
