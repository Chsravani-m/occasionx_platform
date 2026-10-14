"""
Unit tests for service_auth.py. Run from the repo root:

    pip install fastapi python-jose[cryptography] python-dotenv httpx pytest
    pytest services/shared
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import jwt

os.environ["SECRET_KEY"] = "unit-test-secret"
os.environ["ALGORITHM"] = "HS256"
os.environ.pop("INTERNAL_API_KEY", None)

sys.path.insert(0, str(Path(__file__).resolve().parent))

import service_auth as sa  # noqa: E402

SERVICES = Path(__file__).resolve().parent.parent


def token(**claims):
    payload = {"sub": "user-1", "role": "CUSTOMER", "exp": datetime.utcnow() + timedelta(minutes=5)}
    payload.update(claims)
    return jwt.encode(payload, "unit-test-secret", algorithm="HS256")


def bearer(tok):
    return {"Authorization": f"Bearer {tok}"}


app = FastAPI()


@app.get("/me")
def me(user=Depends(sa.current_user)):
    return user


@app.get("/maybe")
def maybe(user=Depends(sa.optional_user)):
    return {"user": user}


@app.get("/onboarding")
def onboarding(user=Depends(sa.onboarding_user)):
    return user


@app.get("/admin")
def admin(user=Depends(sa.require_admin)):
    return user


@app.get("/internal")
def internal(user=Depends(sa.require_internal)):
    return user


client = TestClient(app)


def test_access_token_accepted():
    r = client.get("/me", headers=bearer(token()))
    assert r.status_code == 200
    assert r.json()["sub"] == "user-1"


def test_missing_and_bad_tokens_rejected():
    assert client.get("/me").status_code == 401
    assert client.get("/me", headers=bearer("garbage")).status_code == 401
    wrong_key = jwt.encode({"sub": "u", "role": "ADMIN"}, "other", algorithm="HS256")
    assert client.get("/me", headers=bearer(wrong_key)).status_code == 401
    expired = token(exp=datetime.utcnow() - timedelta(minutes=1))
    assert client.get("/me", headers=bearer(expired)).status_code == 401


def test_refresh_token_cannot_be_used_as_access_token():
    assert client.get("/me", headers=bearer(token(type="refresh"))).status_code == 401


def test_onboarding_token_only_where_allowed():
    tok = token(role="PROVIDER", scope=sa.ONBOARDING_SCOPE)
    assert client.get("/me", headers=bearer(tok)).status_code == 401
    assert client.get("/onboarding", headers=bearer(tok)).status_code == 200


def test_optional_user():
    assert client.get("/maybe").json() == {"user": None}
    assert client.get("/maybe", headers=bearer(token())).json()["user"]["sub"] == "user-1"


def test_admin_roles():
    assert client.get("/admin", headers=bearer(token())).status_code == 403
    assert client.get("/admin", headers=bearer(token(role="ADMIN"))).status_code == 200
    assert client.get("/admin", headers=bearer(token(role="SUPER_ADMIN"))).status_code == 200


def test_internal_key():
    assert client.get("/internal").status_code == 403
    assert client.get("/internal", headers={sa.INTERNAL_HEADER: "guess"}).status_code == 403
    good = {sa.INTERNAL_HEADER: sa.internal_api_key()}
    assert client.get("/internal", headers=good).status_code == 200
    # Other services count as admins for cross-service calls.
    assert client.get("/admin", headers=good).status_code == 200


def test_ensure_self_or_admin():
    sa.ensure_self_or_admin({"sub": "a", "role": "CUSTOMER"}, "a")
    sa.ensure_self_or_admin({"sub": "x", "role": "ADMIN"}, "a")
    with pytest.raises(Exception):
        sa.ensure_self_or_admin({"sub": "b", "role": "CUSTOMER"}, "a")
    with pytest.raises(Exception):
        sa.ensure_self_or_admin({"sub": "b", "role": "CUSTOMER"}, None)


def test_internal_key_only_sent_to_services(monkeypatch):
    monkeypatch.setenv("BOOKING_SERVICE_URL", "http://booking-service:8000")
    assert sa.is_internal_url("http://booking-service:8000/bookings")
    assert sa.is_internal_url("http://localhost:8003/providers/x")
    assert not sa.is_internal_url("https://api.razorpay.com/v1/orders")
    assert not sa.is_internal_url("https://graph.facebook.com/v21.0/x")
    assert not sa.is_internal_url("http://localhost:3000/")


@pytest.mark.parametrize(
    "service",
    [
        "auth-service",
        "user-service",
        "provider-service",
        "catalog-service",
        "booking-service",
        "search-service",
        "ai-service",
        "collab-service",
    ],
)
def test_service_copies_match(service):
    source = (SERVICES / "shared" / "service_auth.py").read_text()
    copy = SERVICES / service / "app" / "core" / "service_auth.py"
    assert copy.read_text() == source, (
        f"{copy} is out of date - run python services/shared/sync_service_auth.py"
    )
