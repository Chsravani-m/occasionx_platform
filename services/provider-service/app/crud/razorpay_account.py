"""
Automates Razorpay's Route "Linked Account" onboarding for a provider,
so booking-service can start splitting payments straight to them
instead of everything landing in OccasionX's own Razorpay account.

This is a real 3-step process against Razorpay's live REST API (not
the razorpay-python SDK, which doesn't cover the Route Linked
Account / product-configuration endpoints used here):

  1. POST /v2/accounts                                 - create the account
  2. POST /v2/accounts/{id}/products                    - request the "route" product
  3. PATCH /v2/accounts/{id}/products/{product_id}       - submit settlement (bank) details

Each step is only attempted once per provider (skipped if already
done), except step 3, which is safe and cheap to re-run any time bank
details change. Razorpay's own KYC review can still come back with
"requirements" (e.g. proof of identity/address) that need real
documents uploaded - that part isn't automated here, it's surfaced to
the provider/admin via razorpay_account_requirements so they know a
manual step with Razorpay is still needed.

IMPORTANT: this hits Razorpay's LIVE API using the same production
keys as the rest of this app - there is no sandbox/test-mode branch
here (unlike bookings/registration fees) because creating a Linked
Account doesn't move any money by itself. It also can't be exercised
from this project's sandbox environment (no network egress to
Razorpay), so this has only been reviewed for structural/schema
correctness against Razorpay's docs, not exercised against a real
account - treat the first real attempt as the actual test.
"""

import json
import os

import requests
from requests.auth import HTTPBasicAuth
from sqlalchemy.orm import Session

from app.db.models.provider import Provider

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_BASE_URL = "https://api.razorpay.com/v2"

REQUEST_TIMEOUT_SECONDS = 30


class RazorpayAccountError(Exception):
    """
    Raised whenever a step of the linked-account onboarding call to
    Razorpay's REST API fails - wraps whatever error message Razorpay
    itself returned (Razorpay's error responses are descriptive, e.g.
    naming the exact invalid field) so it can be shown to the
    provider/admin as-is and used to fix the request, since this
    can't be tested live ahead of time from this environment.
    """


def _auth() -> HTTPBasicAuth:
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise RazorpayAccountError(
            "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured "
            "on provider-service."
        )

    return HTTPBasicAuth(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)


def _parse_response(resp: requests.Response) -> dict:
    if resp.ok:
        return resp.json()

    try:
        body = resp.json()
        error = body.get("error") or {}
        message = (
            error.get("description")
            or error.get("reason")
            or error.get("code")
            or resp.text
        )
    except ValueError:
        message = resp.text or f"HTTP {resp.status_code}"

    raise RazorpayAccountError(message)


def _digits_only(value: str | None) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def _create_linked_account(provider: Provider) -> dict:
    payload = {
        "email": provider.email,
        "phone": _digits_only(provider.phone)[-15:],
        "legal_business_name": provider.business_name,
        "customer_facing_business_name": provider.business_name,
        "business_type": provider.business_type,
        "reference_id": str(provider.id),
        "contact_name": provider.owner_name or provider.business_name,
        "profile": {
            "category": provider.business_category,
            "subcategory": provider.business_subcategory,
            "addresses": {
                "registered": {
                    "street1": provider.razorpay_address_line1 or "",
                    "street2": provider.razorpay_address_line2 or "",
                    "city": provider.razorpay_city or "",
                    "state": provider.razorpay_state or "",
                    "postal_code": provider.razorpay_postal_code or "",
                    "country": "IN",
                }
            },
        },
        "legal_info": {
            "pan": provider.pan_number,
        },
    }

    resp = requests.post(
        f"{RAZORPAY_BASE_URL}/accounts",
        json=payload,
        auth=_auth(),
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    return _parse_response(resp)


def _request_route_product(account_id: str) -> dict:
    resp = requests.post(
        f"{RAZORPAY_BASE_URL}/accounts/{account_id}/products",
        json={
            "product_name": "route",
            "tnc_accepted": True,
        },
        auth=_auth(),
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    return _parse_response(resp)


def _update_settlement_details(
    account_id: str,
    product_id: str,
    provider: Provider,
) -> dict:
    resp = requests.patch(
        f"{RAZORPAY_BASE_URL}/accounts/{account_id}/products/{product_id}",
        json={
            "tnc_accepted": True,
            "settlements": {
                "account_number": provider.bank_account_number,
                "ifsc_code": provider.bank_ifsc_code,
                "beneficiary_name": provider.bank_account_holder_name,
            },
        },
        auth=_auth(),
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    return _parse_response(resp)


def _extract_requirements(settlement: dict) -> list[str]:
    requirements = settlement.get("requirements") or []

    return [
        (item.get("field_reference") or item.get("reason_code") or str(item))
        for item in requirements
        if isinstance(item, dict) and item.get("status") != "validated"
    ]


def setup_linked_account(db: Session, provider: Provider) -> Provider:
    """
    Runs (or resumes) Razorpay's 3-step Route linked-account onboarding
    for this provider using whatever business/bank details are already
    saved on their record. Safe to call again later, e.g. after the
    provider edits their bank details - steps 1/2 are skipped once
    already done, step 3 (settlement details) always re-runs so bank
    edits reach Razorpay and the latest activation_status/requirements
    are refreshed.
    """

    try:
        if not provider.razorpay_linked_account_id:
            account = _create_linked_account(provider)
            provider.razorpay_linked_account_id = account["id"]
            provider.razorpay_account_status = account.get("status")
            db.add(provider)
            db.commit()
            db.refresh(provider)

        if not provider.razorpay_product_id:
            product = _request_route_product(
                provider.razorpay_linked_account_id
            )
            provider.razorpay_product_id = product["id"]
            provider.razorpay_account_status = product.get(
                "activation_status", provider.razorpay_account_status
            )
            db.add(provider)
            db.commit()
            db.refresh(provider)

        settlement = _update_settlement_details(
            provider.razorpay_linked_account_id,
            provider.razorpay_product_id,
            provider,
        )

        provider.razorpay_account_status = settlement.get(
            "activation_status", provider.razorpay_account_status
        )

        requirements = _extract_requirements(settlement)
        provider.razorpay_account_requirements = (
            json.dumps(requirements) if requirements else None
        )
        provider.razorpay_account_error = None

    except RazorpayAccountError as exc:
        provider.razorpay_account_error = str(exc)
        db.add(provider)
        db.commit()
        db.refresh(provider)
        raise

    db.add(provider)
    db.commit()
    db.refresh(provider)

    return provider
