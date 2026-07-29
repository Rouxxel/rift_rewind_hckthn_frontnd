"""
#############################################################################
### Redis client
###
### Lazy optional Redis connection. Never crashes the API on failure.
#############################################################################
"""

import os
from typing import Optional

import redis

from src.utils.custom_logger import log_handler

_redis_client: Optional[redis.Redis] = None
_connection_attempted = False


def _is_redis_enabled() -> bool:
    return os.getenv("REDIS_ENABLED", "false").strip().lower() in ("1", "true", "yes")


def _ssl_enabled() -> bool:
    return os.getenv("REDIS_SSL", "false").strip().lower() in ("1", "true", "yes")


def get_redis() -> Optional[redis.Redis]:
    """
    Return a Redis client when enabled and reachable, otherwise None.
    Connection is attempted lazily on first use.
    """
    global _redis_client, _connection_attempted

    if not _is_redis_enabled():
        return None

    if _redis_client is not None:
        return _redis_client

    if _connection_attempted and _redis_client is None:
        return None

    _connection_attempted = True
    host = os.getenv("REDIS_HOST", "localhost")
    port = int(os.getenv("REDIS_PORT", "6379"))
    password = os.getenv("REDIS_PASSWORD") or None
    db = int(os.getenv("REDIS_DB", "0"))
    use_ssl = _ssl_enabled()

    try:
        client = redis.Redis(
            host=host,
            port=port,
            password=password,
            db=db,
            ssl=use_ssl,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()
        _redis_client = client
        log_handler.info(f"[redis_client] Redis connected at {host}:{port}/{db} (ssl={use_ssl})")
        return _redis_client
    except Exception as exc:
        log_handler.warning(f"[redis_client] Redis connection failed ({host}:{port}): {exc}")
        _redis_client = None
        return None


def close_redis() -> None:
    """Close the Redis connection if open."""
    global _redis_client, _connection_attempted
    if _redis_client is not None:
        try:
            _redis_client.close()
            log_handler.info("[redis_client] Redis connection closed")
        except Exception as exc:
            log_handler.warning(f"[redis_client] Error closing Redis: {exc}")
        finally:
            _redis_client = None
            _connection_attempted = False


def get_redis_status() -> str:
    """
    Return redis health status for the root endpoint.

    Values: disabled | connected | unavailable
    """
    if not _is_redis_enabled():
        return "disabled"

    client = get_redis()
    if client is None:
        return "unavailable"

    try:
        client.ping()
        return "connected"
    except Exception:
        return "unavailable"
