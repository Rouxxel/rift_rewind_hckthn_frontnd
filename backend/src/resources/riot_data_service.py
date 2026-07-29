"""
#############################################################################
### Riot / Data Dragon cache-aside helpers (service layer)
###
### Routers call these helpers; they alone talk to redis_service.
#############################################################################
"""

from typing import Any, Awaitable, Callable, Optional

from src.resources.cache.redis_service import cache_get, cache_set
from src.utils.custom_logger import log_handler


async def cached_or_fetch(
    cache_key: str,
    ttl_seconds: int,
    fetch_fn: Callable[[], Awaitable[Any]],
    log_prefix: str = "riot_data_service",
) -> Any:
    """
    Cache-aside: return cached value on hit, otherwise await fetch_fn(),
    store the result, and return it. Errors from fetch_fn propagate.
    """
    cached = cache_get(cache_key)
    if cached is not None:
        log_handler.info(f"[{log_prefix}] cache hit: {cache_key}")
        return cached

    log_handler.info(f"[{log_prefix}] cache miss: {cache_key}")
    result = await fetch_fn()
    if result is not None:
        cache_set(cache_key, result, expiration_seconds=ttl_seconds)
    return result
