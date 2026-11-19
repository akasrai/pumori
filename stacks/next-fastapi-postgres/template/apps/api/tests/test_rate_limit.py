from helpers import PASSWORD, api_client, sign_up, unique_email


def test_login_is_limited_per_ip() -> None:
    with api_client(RATE_LIMIT_AUTH_MAX=2) as client:
        for _ in range(2):
            client.post("/auth/login", json={"email": unique_email(), "password": "whatever1"})
        res = client.post("/auth/login", json={"email": unique_email(), "password": "whatever1"})
        assert res.status_code == 429
        assert res.json()["error"]["code"] == "RATE_LIMITED"
        assert int(res.headers["retry-after"]) > 0


def test_login_is_limited_per_email() -> None:
    with api_client(RATE_LIMIT_LOGIN_EMAIL_MAX=2) as client:
        user = sign_up(client)
        for _ in range(2):
            client.post("/auth/login", json={"email": user.email, "password": "wrong password"})
        res = client.post("/auth/login", json={"email": user.email, "password": PASSWORD})
        assert res.status_code == 429


def test_every_route_has_a_global_limit_but_health_checks_do_not() -> None:
    with api_client(RATE_LIMIT_MAX=3) as client:
        statuses = [client.get("/auth/me").status_code for _ in range(4)]
        assert statuses[:3] == [401, 401, 401]
        assert statuses[3] == 429
        assert client.get("/livez").status_code == 200


def test_x_forwarded_for_is_ignored_unless_trusted() -> None:
    with api_client(RATE_LIMIT_MAX=2) as client:
        for i in range(2):
            client.get("/auth/me", headers={"x-forwarded-for": f"10.0.0.{i}"})
        assert client.get("/auth/me", headers={"x-forwarded-for": "10.0.0.9"}).status_code == 429
