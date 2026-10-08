import os

from dotenv import load_dotenv
import razorpay

load_dotenv()

# Real Razorpay credentials - get test-mode keys from
# https://dashboard.razorpay.com/app/keys and put them in a .env file
# in services/booking-service/ (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).
# Nothing here works until those are set - this is intentional, there
# is no mock/fallback mode.
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")


def get_razorpay_client() -> razorpay.Client:
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise RuntimeError(
            "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured. "
            "Add them to a .env file in services/booking-service/ - "
            "get test-mode keys from "
            "https://dashboard.razorpay.com/app/keys"
        )

    return razorpay.Client(
        auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
    )
