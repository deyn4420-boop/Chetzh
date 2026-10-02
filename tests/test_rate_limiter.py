import uuid

import fakeredis.aioredis
import pytest

import app.services.rate_limiter as rate_limiter_module
from app.config import settings
from app.services.rate_limiter import check_rate_limit


@pytest.fixture(autouse=True)
def fake_redis(monkeypatch):
    """Swap the real Redis client for an in-memory fake for this test module."""
    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(rate_limiter_module, "redis_client", fake_client)
    return fake_client


@pytest.mark.asyncio
async def test_allows_messages_under_the_limit():
    user_id = uuid.uuid4()
    for _ in range(settings.ws_message_rate_limit):
        assert await check_rate_limit(user_id) is True


@pytest.mark.asyncio
async def test_blocks_messages_over_the_limit():
    user_id = uuid.uuid4()
    for _ in range(settings.ws_message_rate_limit):
        await check_rate_limit(user_id)

    # One more than the configured limit should be rejected
    assert await check_rate_limit(user_id) is False


@pytest.mark.asyncio
async def test_different_users_have_independent_limits():
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()

    for _ in range(settings.ws_message_rate_limit):
        await check_rate_limit(user_a)

    # user_a is now over their limit, but user_b hasn't sent anything yet
    assert await check_rate_limit(user_a) is False
    assert await check_rate_limit(user_b) is True
