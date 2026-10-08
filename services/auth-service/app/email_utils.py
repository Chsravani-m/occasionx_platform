"""
SMTP email sending for customer email verification.

Mirrors provider-service's app/email_utils.py, which already does the
same thing for provider registration-fee activation emails - same
Gmail account, same non-fatal best-effort pattern. Before this,
register_user() in services/auth_service.py just printed the
verification link to the console, so customers registering for real
never actually received anything.

Configure via a .env file in services/auth-service/:

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USERNAME=you@example.com
    SMTP_PASSWORD=your-app-password
    SMTP_FROM_EMAIL=OccasionX <you@example.com>
    FRONTEND_URL=http://localhost:3000

Sending is treated as best-effort / non-fatal: the user account has
already been created by the time this is called, so a misconfigured
or temporarily-down mail server should never fail the registration API
call. On failure this logs a clear warning to the console (including
the verification link itself, so it can still be handed to the
customer manually while SMTP is being set up) and returns False
instead of raising.
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


def build_verification_link(token: str) -> str:
    return f"{FRONTEND_URL}/verify-email?token={token}"


def build_reset_link(token: str) -> str:
    return f"{FRONTEND_URL}/reset-password?token={token}"


def send_password_reset_email(
    to_email: str,
    token: str,
) -> bool:
    reset_link = build_reset_link(token)

    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        print(
            "Warning: SMTP is not configured (SMTP_HOST/SMTP_USERNAME/"
            "SMTP_PASSWORD missing from services/auth-service/.env) - "
            "password reset email was NOT sent. Reset link for "
            f"{to_email}: {reset_link}"
        )
        return False

    subject = "Reset your OccasionX password"

    text_body = (
        "Hi,\n\n"
        "We received a request to reset your OccasionX password. "
        "Open the link below to choose a new one:\n\n"
        f"{reset_link}\n\n"
        "This link expires in 1 hour. If you didn't request this, "
        "you can safely ignore this email - your password won't be "
        "changed.\n\n"
        "- The OccasionX Team"
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #24352F;">
      <h2 style="color:#253D8A;">Reset your OccasionX password</h2>
      <p>
        We received a request to reset your OccasionX password.
      </p>
      <p style="margin: 24px 0;">
        <a href="{reset_link}"
           style="background:#253D8A;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
      </p>
      <p style="color:#5B756D;font-size:13px;">
        Or copy this link into your browser:<br>{reset_link}
      </p>
      <p style="color:#5B756D;font-size:13px;">
        This link expires in 1 hour. If you didn't request this, you
        can safely ignore this email.
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

        print(f"Password reset email sent to {to_email}")
        return True

    except Exception as e:
        print(
            f"Warning: failed to send password reset email to "
            f"{to_email}: {e}. Reset link: {reset_link}"
        )
        return False


def send_verification_email(
    to_email: str,
    full_name: str,
    token: str,
) -> bool:
    verification_link = build_verification_link(token)

    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        print(
            "Warning: SMTP is not configured (SMTP_HOST/SMTP_USERNAME/"
            "SMTP_PASSWORD missing from services/auth-service/.env) - "
            "verification email was NOT sent. Verification link for "
            f"{to_email}: {verification_link}"
        )
        return False

    subject = "Verify your OccasionX account"

    text_body = (
        f"Hi {full_name or 'there'},\n\n"
        "Thanks for registering with OccasionX. Please verify your "
        "email by opening the link below:\n\n"
        f"{verification_link}\n\n"
        "You won't be able to log in until your account is verified. "
        "If you didn't request this, you can ignore this email.\n\n"
        "- The OccasionX Team"
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #24352F;">
      <h2 style="color:#253D8A;">Verify your OccasionX account</h2>
      <p>Hi {full_name or 'there'},</p>
      <p>
        Thanks for registering with OccasionX. Please verify your
        email to activate your account.
      </p>
      <p style="margin: 24px 0;">
        <a href="{verification_link}"
           style="background:#253D8A;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:bold;">
          Verify Email
        </a>
      </p>
      <p style="color:#5B756D;font-size:13px;">
        Or copy this link into your browser:<br>{verification_link}
      </p>
      <p style="color:#5B756D;font-size:13px;">
        You won't be able to log in until your account is verified.
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

        print(f"Verification email sent to {to_email}")
        return True

    except Exception as e:
        print(
            f"Warning: failed to send verification email to {to_email}: "
            f"{e}. Verification link: {verification_link}"
        )
        return False


def test_smtp_connection() -> dict:
    """
    Diagnostic-only: tries to connect + authenticate to the configured
    SMTP server (without sending anything) and returns exactly what
    went wrong, since send_verification_email() only prints to the
    console and swallows the exception.
    """

    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        return {
            "ok": False,
            "error": "SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD missing "
                     "from .env",
        }

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)

        return {"ok": True}

    except Exception as e:
        return {
            "ok": False,
            "error_type": type(e).__name__,
            "error": str(e),
        }
