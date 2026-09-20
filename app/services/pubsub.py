import asyncio
import uuid

import redis.asyncio as redis

from app.config import settings
from app.services.connection_manager import manager

redis_client: redis.Redis = redis.from_url(settings.redis_url, decode_responses=True)

_ROOM_CHANNEL_PREFIX = "room:"
_PRESENCE_KEY_PREFIX = "presence:"  # presence:{room_id} -> Redis SET of online user_ids


def _channel_name(room_id: uuid.UUID) -> str:
    return f"{_ROOM_CHANNEL_PREFIX}{room_id}"


async def publish_to_room(room_id: uuid.UUID, payload: str) -> None:
    """
    Publish a message to a room's Redis channel. Every server instance subscribed
    to this channel (see listen_and_forward below) receives it and forwards to
    whichever local sockets it holds for that room - including the instance that
    published it, so the sender's own other tabs/devices get it too.
    """
    await redis_client.publish(_channel_name(room_id), payload)


async def listen_and_forward() -> None:
    """
    Long-running background task (started once per process at app startup).
    Subscribes to every room channel via a pattern match and forwards each
    incoming message to whatever local WebSocket connections this process
    is holding for that room. This is the piece that makes horizontal scaling
    work: it doesn't matter which instance a message originated on.
    """
    pubsub = redis_client.pubsub()
    await pubsub.psubscribe(f"{_ROOM_CHANNEL_PREFIX}*")

    try:
        async for message in pubsub.listen():
            if message["type"] != "pmessage":
                continue

            channel: str = message["channel"]
            room_id_str = channel.removeprefix(_ROOM_CHANNEL_PREFIX)
            try:
                room_id = uuid.UUID(room_id_str)
            except ValueError:
                continue

            await manager.send_to_local_room(room_id, message["data"])
    except asyncio.CancelledError:
        await pubsub.punsubscribe(f"{_ROOM_CHANNEL_PREFIX}*")
        raise


# --- Presence: who's online in a room, tracked in Redis so it's visible across instances ---


async def mark_online(room_id: uuid.UUID, user_id: uuid.UUID) -> None:
    await redis_client.sadd(f"{_PRESENCE_KEY_PREFIX}{room_id}", str(user_id))


async def mark_offline(room_id: uuid.UUID, user_id: uuid.UUID) -> None:
    await redis_client.srem(f"{_PRESENCE_KEY_PREFIX}{room_id}", str(user_id))


async def get_online_user_ids(room_id: uuid.UUID) -> set[str]:
    return await redis_client.smembers(f"{_PRESENCE_KEY_PREFIX}{room_id}")
