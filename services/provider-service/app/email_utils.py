"""
Minimal SMTP email sending for provider account activation.

There's no shared email infrastructure anywhere else in this project
yet (every other "verification email" in the codebase - see
auth-service's register_user - just prints the link to the console).
This is the first real send-an-email integration, so it lives here
as a small self-contained helper rather than a new microservice.

Configure via a .env file in services/provider-service/:

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USERNAME=you@example.com
    SMTP_PASSWORD=your-app-password
    SMTP_FROM_EMAIL=OccasionX <you@example.com>
    FRONTEND_URL=http://localhost:3000

Sending is treated as best-effort / non-fatal: the registration fee
payment has already succeeded by the time this is called, so a
misconfigured or temporarily-down mail server should never fail the
payment API call. On failure this logs a clear warning to the
console (including the activation link itself, so it can still be
handed to the provider manually while SMTP is being set up) and
returns False instead of raising.
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

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def build_activation_link(token: str) -> str:
    return f"{FRONTEND_URL}/provider/activate?token={token}"


def send_activation_email(
    to_email: str,
    business_name: str,
    token: str,
) -> bool:
    activation_link = build_activation_link(token)

    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        print(
            "Warning: SMTP is not configured (SMTP_HOST/SMTP_USERNAME/"
            "SMTP_PASSWORD missing from services/provider-service/.env) "
            "- activation email was NOT sent. Activation link for "
            f"{to_email}: {activation_link}"
        )
        return False

    subject = "Activate your OccasionX provider account"

    text_body = (
        f"Hi {business_name or 'there'},\n\n"
        "Thanks for completing your OccasionX registration payment. "
        "Please activate your provider account by opening the link "
        "below:\n\n"
        f"{activation_link}\n\n"
        "You won't be able to log in until your account is activated. "
        "If you didn't request this, you can ignore this email.\n\n"
        "- The OccasionX Team"
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #24352F;">
      <h2 style="color:#253D8A;">Activate your OccasionX provider account</h2>
      <p>Hi {business_name or 'there'},</p>
      <p>
        Thanks for completing your OccasionX registration payment.
        Please activate your provider account to finish setting up
        your listing.
      </p>
      <p style="margin: 24px 0;">
        <a href="{activation_link}"
           style="background:#253D8A;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:bold;">
          Activate Account
        </a>
      </p>
      <p style="color:#5B756D;font-size:13px;">
        Or copy this link into your browser:<br>{activation_link}
      </p>
      <p style="color:#5B756D;font-size:13px;">
        You won't be able to log in until your account is activated.
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

        print(f"Activation email sent to {to_email}")
        return True

    except Exception as e:
        print(
            f"Warning: failed to send activation email to {to_email}: {e}. "
            f"Activation link: {activation_link}"
        )
        return False
