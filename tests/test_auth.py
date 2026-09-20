import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    register_resp = await client.post(
        "/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "hunter2"},
    )
    assert register_resp.status_code == 201
    assert register_resp.json()["username"] == "alice"

    login_resp = await client.post("/auth/login", json={"username": "alice", "password": "hunter2"})
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password_fails(client):
    await client.post(
        "/auth/register",
        json={"username": "bob", "email": "bob@example.com", "password": "correct-pw"},
    )
    resp = await client.post("/auth/login", json={"username": "bob", "password": "wrong-pw"})
    assert resp.status_code == 401
