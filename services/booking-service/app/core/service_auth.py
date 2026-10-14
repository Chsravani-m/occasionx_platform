"""
Request authentication shared by every OccasionX backend service.

SOURCE OF TRUTH: services/shared/service_auth.py. Each service keeps an
identical copy at app/core/service_auth.py (each service is built and
run on its own, so it can't import across folders). After editing this
file, run `python services/shared/sync_service_auth.py`; the test
services/shared/test_service_auth.py fails if any copy drifts.

Three kinds of caller reach a service:

1. Browsers / mobile apps, through the API gateway, with
   `Authorization: Bearer <access token>` issued by auth-service.
2. Other OccasionX services, calling each other directly on the private
   network. They send `X-Internal-Key`, a secret derived from
   SECRET_KEY (or INTERNAL_API_KEY if set), which outside callers never
   see. `install_internal_auth()` adds the header automatically to
   every outgoing `requests` / `httpx` call aimed at another service.
3. Anonymous visitors browsing public pages - endpoints that should
   allow this simply don't depend on `current_user`.

FastAPI dependencies exported here:

    current_user          401 unless a valid access token or internal key
    optional_user         same, but returns None for anonymous callers
    optional_onboarding_user  optional_user that also accepts the
                          provider-onboarding token
    onboarding_user       like current_user, but also accepts the
                          short-lived provider-onboarding token
    require_admin         403 unless ADMIN / SUPER_ADMIN (or internal)
    require_internal      403 unless another OccasionX service

Helpers: is_admin(user), is_internal(user), ensure_self_or_admin(user, id).
"""

from __future__ import annotations

import hashlib
import hmac
import os
from urllib.parse import urlsplit

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

load_dotenv()

INTERNAL_HEADER = "X-Internal-Key"
ADMIN_ROLES = frozenset({"ADMIN", "SUPER_ADMIN"})

# Token "scope" for the limited token handed to a provider while they
# fill in the registration wizard, before their account is activated.
ONBOARDING_SCOPE = "provider_onboarding"

_bearer = HTTPBearer(auto_error=False)

_INTERNAL_PRINCIPAL = {"sub": None, "role": "INTERNAL", "internal": True}


# --------------------------------------------------------------- secrets
def _secret_key() -> str:
    key = os.getenv("SECRET_KEY")
    if not key:
        raise RuntimeError("SECRET_KEY is not set")
    return key


def _algorithm() -> str:
    return os.getenv("ALGORITHM") or "HS256"


def internal_api_key() -> str:
    explicit = os.getenv("INTERNAL_API_KEY")
    if explicit:
        return explicit
    return hmac.new(
        _secret_key().encode(), b"occasionx-internal-api", hashlib.sha256
    ).hexdigest()


# --------------------------------------------------------------- decoding
def decode_access_token(token: str, allow_onboarding: bool = False) -> dict | None:
    """Payload of a valid access token, or None."""
    try:
        payload = jwt.decode(token, _secret_key(), algorithms=[_algorithm()])
    except JWTError:
        return None

    # Refresh tokens are signed with the same key; they must only ever
    # be exchanged at /auth/refresh, never used to call the API.
    if payload.get("type") == "refresh":
        return None

    if payload.get("scope") == ONBOARDING_SCOPE and not allow_onboarding:
        return None

    if not payload.get("sub") or not payload.get("role"):
        return None

    return payload


def _is_internal_request(request: Request) -> bool:
    supplied = request.headers.get(INTERNAL_HEADER)
    return bool(supplied) and hmac.compare_digest(supplied, internal_api_key())


def _resolve(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
    allow_onboarding: bool,
) -> dict | None:
    if _is_internal_request(request):
        return dict(_INTERNAL_PRINCIPAL)

    if credentials is None:
        return None

    payload = decode_access_token(credentials.credentials, allow_onboarding)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


# ----------------------------------------------------------- dependencies
def optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict | None:
    return _resolve(request, credentials, allow_onboarding=False)


def optional_onboarding_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict | None:
    return _resolve(request, credentials, allow_onboarding=True)


def current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    user = _resolve(request, credentials, allow_onboarding=False)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def onboarding_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    user = _resolve(request, credentials, allow_onboarding=True)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: dict = Depends(current_user)) -> dict:
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_internal(request: Request) -> dict:
    if not _is_internal_request(request):
        raise HTTPException(status_code=403, detail="Internal endpoint")
    return dict(_INTERNAL_PRINCIPAL)


# ---------------------------------------------------------------- helpers
def is_internal(user: dict | None) -> bool:
    return bool(user and user.get("internal"))


def is_admin(user: dict | None) -> bool:
    """Admins and other services may act on any record."""
    return bool(user) and (is_internal(user) or user.get("role") in ADMIN_ROLES)


def ensure_self_or_admin(user: dict, owner_user_id) -> None:
    """403 unless `user` is the owner (token sub) or an admin/service."""
    if is_admin(user):
        return
    if owner_user_id is None or str(user.get("sub")) != str(owner_user_id):
        raise HTTPException(status_code=403, detail="Not allowed")


# ------------------------------------------------- outgoing service calls
_DEFAULT_SERVICE_PORTS = range(8001, 8010)


def _internal_targets() -> set[tuple[str, int | None]]:
    targets: set[tuple[str, int | None]] = set()
    for name, value in os.environ.items():
        if name.endswith("_SERVICE_URL") and value:
            parts = urlsplit(value)
            if parts.hostname:
                targets.add((parts.hostname.lower(), parts.port))
    for host in ("localhost", "127.0.0.1"):
        for port in _DEFAULT_SERVICE_PORTS:
            targets.add((host, port))
    return targets


def is_internal_url(url) -> bool:
    parts = urlsplit(str(url))
    if not parts.hostname:
        return False
    return (parts.hostname.lower(), parts.port) in _internal_targets()


_installed = False


def install_internal_auth() -> None:
    """
    Make every outgoing requests/httpx call to another OccasionX service
    carry the internal key. Calls to anything else (Razorpay, Meta,
    OpenAI, ...) are left untouched. Call once at startup.
    """
    global _installed
    if _installed:
        return
    _installed = True

    try:
        import requests

        original_request = requests.Session.request

        def request_with_key(self, method, url, *args, **kwargs):
            if is_internal_url(url):
                headers = dict(kwargs.get("headers") or {})
                headers[INTERNAL_HEADER] = internal_api_key()
                kwargs["headers"] = headers
            return original_request(self, method, url, *args, **kwargs)

        requests.Session.request = request_with_key
    except ImportError:
        pass

    try:
        import httpx

        original_send = httpx.Client.send
        original_async_send = httpx.AsyncClient.send

        def send_with_key(self, request, *args, **kwargs):
            if is_internal_url(request.url):
                request.headers[INTERNAL_HEADER] = internal_api_key()
            return original_send(self, request, *args, **kwargs)

        async def async_send_with_key(self, request, *args, **kwargs):
            if is_internal_url(request.url):
                request.headers[INTERNAL_HEADER] = internal_api_key()
            return await original_async_send(self, request, *args, **kwargs)

        httpx.Client.send = send_with_key
        httpx.AsyncClient.send = async_send_with_key
    except ImportError:
        pass
