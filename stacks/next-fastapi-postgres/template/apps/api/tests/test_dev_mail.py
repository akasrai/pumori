from fastapi.testclient import TestClient

from app.main import create_app
from helpers import api_client, app_state, production_settings, sign_up


def test_the_outbox_shows_only_the_signed_in_users_mail() -> None:
    with api_client() as client:
        me, other = sign_up(client), sign_up(client)
        app_state(client).mailer.send(me.email, "Hello", "for me")
        app_state(client).mailer.send(other.email, "Hello", "not for me")
        res = client.get("/dev/mail", headers={"cookie": me.cookie})
        assert res.status_code == 200
        assert [m["text"] for m in res.json()["mail"]] == ["for me"]


def test_the_outbox_needs_a_session() -> None:
    with api_client() as client:
        assert client.get("/dev/mail").status_code == 401


def test_the_outbox_does_not_exist_in_production() -> None:
    with TestClient(create_app(production_settings())) as client:
        assert client.get("/dev/mail").status_code == 404
