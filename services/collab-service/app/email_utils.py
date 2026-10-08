"""
SMTP email sending for group-planning session invites. Mirrors
auth-service's/provider-service's app/email_utils.py - same
best-effort, non-fatal pattern. Configure via a .env file in
services/collab-service/:

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USERNAME=you@example.com
    SMTP_PASSWORD=your-app-password
    SMTP_FROM_EMAIL=OccasionX <you@example.com>
    FRONTEND_URL=http://localhost:3000

Sending is best-effort: the invite/participant row has already been
created by the time this is called, so a misconfigured or down mail
server should never fail the invite API call. On failure this logs a
clear warning (including the invite link itself, so it can still be
shared manually) and returns False instead of raising.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME)


def send_session_invite_email(
    to_email: str,
    host_name: str,
    invite_link: str,
    title: str | None = None,
) -> bool:
    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        print(
            "Warning: SMTP is not configured (SMTP_HOST/SMTP_USERNAME/"
            "SMTP_PASSWORD missing from services/collab-service/.env) - "
            "invite email was NOT sent. Invite link for "
            f"{to_email}: {invite_link}"
        )
        return False

    what = title or "an event"
    subject = f"{host_name} invited you to plan {what} together on OccasionX"

    text_body = (
        f"Hi,\n\n"
        f"{host_name} invited you to a shared planning session on "
        f"OccasionX to pick services together for {what}. Open the "
        f"link below to join (up to 3 people can be invited to a "
        f"session):\n\n"
        f"{invite_link}\n\n"
        "- The OccasionX Team"
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #24352F;">
      <h2 style="color:#253D8A;">You're invited to plan together</h2>
      <p>
        <strong>{host_name}</strong> invited you to a shared planning
        session on OccasionX to pick services together for {what}.
      </p>
      <p style="margin: 24px 0;">
        <a href="{invite_link}"
           style="background:#253D8A;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:bold;">
          Join Session
        </a>
      </p>
      <p style="color:#5B756D;font-size:13px;">
        Or copy this link into your browser:<br>{invite_link}
      </p>
    </div>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = to_email
    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, [to_email], message.as_string())

        print(f"Session invite email sent to {to_email}")
        return True

    except Exception as e:
        print(
            f"Warning: failed to send session invite email to "
            f"{to_email}: {e}. Invite link: {invite_link}"
        )
        return False
