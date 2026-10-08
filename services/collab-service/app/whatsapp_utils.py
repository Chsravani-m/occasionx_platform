"""
WhatsApp delivery for group-planning session invites. Wraps
app/meta_whatsapp.py's generic template sender with the one template
this service needs. Configure via a .env file in
services/collab-service/:

    WHATSAPP_INVITE_TEMPLATE_NAME=collab_session_invite
    WHATSAPP_INVITE_TEMPLATE_LANG=en_US

These must match an approved UTILITY template in Meta Business
Manager exactly - the defaults above are just placeholders until one
is registered. While WHATSAPP_TEST_MODE=true (see meta_whatsapp.py),
this just prints to the console, so the invite flow works end-to-end
without any Meta setup.
"""

import os

from dotenv import load_dotenv

from app.meta_whatsapp import send_whatsapp_template

load_dotenv()

WHATSAPP_INVITE_TEMPLATE_NAME = os.getenv(
    "WHATSAPP_INVITE_TEMPLATE_NAME", "collab_session_invite"
)
WHATSAPP_INVITE_TEMPLATE_LANG = os.getenv("WHATSAPP_INVITE_TEMPLATE_LANG", "en_US")


def send_session_invite_whatsapp(
    phone: str,
    host_name: str,
    invite_link: str,
) -> bool:
    """
    Body params, in order: host's name, invite link. Never raises -
    see send_whatsapp_template().
    """
    return send_whatsapp_template(
        to_phone=phone,
        template_name=WHATSAPP_INVITE_TEMPLATE_NAME,
        language_code=WHATSAPP_INVITE_TEMPLATE_LANG,
        body_params=[host_name or "A friend", invite_link],
        button_param=invite_link,
    )
