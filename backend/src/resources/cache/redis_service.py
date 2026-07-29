"""
#############################################################################
### Redis cache service
###
### cache_get / cache_set / cache_delete for service-layer use only.
### No-ops when Redis is disabled or unavailable.
#############################################################################
"""

import json
from typing import Any, Optional

from src.resources.cache.redis_client import get_redis
from src.utils.custom_logger import log_handler


def cache_get(key: str) -> Optional[Any]:
    """Return deserialized JSON value for key, or None on miss/disabled/error."""
    client = get_redis()
    if client is None:
        return None

    try:
        raw = client.get(key)
        if raw is None:
            log_handler.debug(f"[redis_service] cache miss: {key}")
            return None
        log_handler.debug(f"[redis_service] cache hit: {key}")
        return json.loads(raw)
    except Exception as exc:
        log_handler.warning(f"[redis_service] cache_get failed for {key}: {exc}")
        return None


def cache_set(key: str, value: Any, expiration_seconds: int = 600) -> bool:
    """Serialize value as JSON and store with TTL. Returns True on success."""
    client = get_redis()
    if client is None:
        return False

    try:
        payload = json.dumps(value)
        client.setex(key, expiration_seconds, payload)
        log_handler.debug(f"[redis_service] cache set: {key} (ttl={expiration_seconds}s)")
        return True
    except Exception as exc:
        log_handler.warning(f"[redis_service] cache_set failed for {key}: {exc}")
        return False


def cache_delete(key: str) -> bool:
    """Delete a cache key. Returns True if delete was attempted successfully."""
    client = get_redis()
    if client is None:
        return False

    try:
        client.delete(key)
        log_handler.debug(f"[redis_service] cache delete: {key}")
        return True
    except Exception as exc:
        log_handler.warning(f"[redis_service] cache_delete failed for {key}: {exc}")
        return False
