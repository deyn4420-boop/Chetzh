import pytest


async def _register_and_login(client, username: str) -> tuple[str, str]:
    reg = await client.post(
        "/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "hunter2"},
    )
    user_id = reg.json()["id"]

    login = await client.post("/auth/login", json={"username": username, "password": "hunter2"})
    token = login.json()["access_token"]
    return user_id, token


@pytest.mark.asyncio
async def test_create_room_and_fetch_history(client):
    alice_id, alice_token = await _register_and_login(client, "alice")
    bob_id, _ = await _register_and_login(client, "bob")

    headers = {"Authorization": f"Bearer {alice_token}"}
    room_resp = await client.post(
        "/rooms",
        json={"name": "General", "is_group": False, "member_ids": [bob_id]},
        headers=headers,
    )
    assert room_resp.status_code == 201
    room_id = room_resp.json()["id"]

    list_resp = await client.get("/rooms", headers=headers)
    assert list_resp.status_code == 200
    assert any(r["id"] == room_id for r in list_resp.json())

    history_resp = await client.get(f"/rooms/{room_id}/messages", headers=headers)
    assert history_resp.status_code == 200
    assert history_resp.json() == []  # no messages sent yet


@pytest.mark.asyncio
async def test_non_member_cannot_read_history(client):
    _, alice_token = await _register_and_login(client, "alice2")
    _, eve_token = await _register_and_login(client, "eve")

    headers = {"Authorization": f"Bearer {alice_token}"}
    room_resp = await client.post(
        "/rooms", json={"name": "Private", "is_group": False, "member_ids": []}, headers=headers
    )
    room_id = room_resp.json()["id"]

    eve_headers = {"Authorization": f"Bearer {eve_token}"}
    resp = await client.get(f"/rooms/{room_id}/messages", headers=eve_headers)
    assert resp.status_code == 403
