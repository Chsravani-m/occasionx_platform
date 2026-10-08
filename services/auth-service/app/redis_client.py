"""
Shared Redis connection for anything in this service that needs
ephemeral, TTL-backed storage - right now that's just OTP codes (see
app/otp_cache.py), but any future short-lived cache/lock/rate-limit
belongs here too rather than spinning up its own connection.

Configure via a .env file in services/auth-service/:

    REDIS_URL=redis://localhost:6379/0

For a managed provider (Upstash, Redis Cloud, etc.) this is just their
connection string, e.g.:

    REDIS_URL=rediss://default:<password>@<host>:<port>

The client is created lazily and cached on first use rather than at
import time, so importing this module never fails just because Redis
isn't reachable yet - the failure only surfaces when something actually
tries to read/write (matches this codebase's non-fatal, best-effort
notification pattern elsewhere: a Redis outage should degrade OTP
delivery, not crash the whole service at startup).
"""

import os

import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_client: "redis.Redis | None" = None


def get_redis() -> "redis.Redis":
    global _client

    if _client is None:
        _client = redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )

    return _client
