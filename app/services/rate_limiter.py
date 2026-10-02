import uuid

from app.config import settings
from app.services.pubsub import redis_client

_RATE_LIMIT_KEY_PREFIX = "ratelimit:"


async def check_rate_limit(user_id: uuid.UUID) -> bool:
    """
    Fixed-window rate limit, backed by Redis so the cap is enforced correctly
    even when a user's connection could land on any of several app instances
    (an in-memory counter on one process wouldn't see traffic from the others).

    Returns True if the message is allowed, False if the user is over the limit
    for the current window.

    INCR is atomic in Redis, so concurrent messages from the same user (even if
    they somehow land on two different processes at once) can't race past the
    cap - every increment is serialized by Redis itself.
    """
    key = f"{_RATE_LIMIT_KEY_PREFIX}{user_id}"

    count = await redis_client.incr(key)
    if count == 1:
        # Only the request that creates the key sets its expiry, so the window
        # starts counting from this message, not from some stale earlier key.
        await redis_client.expire(key, settings.ws_rate_limit_window_seconds)

    return count <= settings.ws_message_rate_limit
