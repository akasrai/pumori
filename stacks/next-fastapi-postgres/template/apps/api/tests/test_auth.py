from helpers import PASSWORD, api_client, sign_up, unique_email


def test_signup_returns_the_user_and_a_session_cookie() -> None:
    with api_client() as client:
        email = unique_email()
        res = client.post("/auth/signup", json={"email": f"  {email.upper()} ", "password": PASSWORD})
        assert res.status_code == 201
        assert res.json()["user"]["email"] == email
        assert set(res.json()["user"]) == {"id", "email", "createdAt"}
        cookie = res.headers["set-cookie"].lower()
        assert "httponly" in cookie
        assert "samesite=lax" in cookie


def test_signup_with_a_taken_email_is_409() -> None:
    with api_client() as client:
        user = sign_up(client)
        res = client.post("/auth/signup", json={"email": user.email, "password": PASSWORD})
        assert res.status_code == 409
        assert res.json()["error"]["code"] == "EMAIL_TAKEN"


def test_signup_validates_with_user_facing_messages() -> None:
    with api_client() as client:
        res = client.post("/auth/signup", json={"email": "not-an-email", "password": "short"})
        assert res.status_code == 400
        body = res.json()["error"]
        assert body["code"] == "VALIDATION_ERROR"
        assert body["message"] == "email: Enter a valid email address"
        assert {"path": "password", "message": "Password must be at least 8 characters"} in body["details"]


def test_me_needs_a_session() -> None:
    with api_client() as client:
        res = client.get("/auth/me")
        assert res.status_code == 401
        assert res.json() == {"error": {"code": "UNAUTHENTICATED", "message": "Authentication required"}}


def test_me_returns_the_signed_in_user() -> None:
    with api_client() as client:
        user = sign_up(client)
        res = client.get("/auth/me", headers={"cookie": user.cookie})
        assert res.status_code == 200
        assert res.json()["user"]["id"] == str(user.user.id)


def test_login_with_wrong_password_or_unknown_email_is_the_same_401() -> None:
    with api_client() as client:
        user = sign_up(client)
        wrong = client.post("/auth/login", json={"email": user.email, "password": "wrong password"})
        unknown = client.post("/auth/login", json={"email": unique_email(), "password": "whatever1"})
        assert wrong.status_code == unknown.status_code == 401
        assert wrong.json() == unknown.json()
        assert wrong.json()["error"]["message"] == "Invalid email or password"


def test_login_then_logout_ends_the_session() -> None:
    with api_client() as client:
        user = sign_up(client)
        res = client.post("/auth/login", json={"email": user.email, "password": PASSWORD})
        assert res.status_code == 200
        cookie = f"sid={res.cookies['sid']}"
        client.cookies.clear()
        assert client.post("/auth/logout", headers={"cookie": cookie}).status_code == 204
        assert client.get("/auth/me", headers={"cookie": cookie}).status_code == 401


def test_a_tampered_cookie_is_rejected() -> None:
    with api_client() as client:
        user = sign_up(client)
        assert client.get("/auth/me", headers={"cookie": user.cookie[:-2] + "xx"}).status_code == 401
