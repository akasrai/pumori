"""Behaviour every route shares: error shape, security headers, body limits, health checks."""

from helpers import api_client


def test_unknown_route_is_a_404_that_echoes_nothing() -> None:
    with api_client() as client:
        res = client.get("/nope?token=secret")
        assert res.status_code == 404
        assert res.json() == {"error": {"code": "NOT_FOUND", "message": "Route not found"}}


def test_wrong_method_is_405() -> None:
    with api_client() as client:
        assert client.delete("/auth/me").json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_responses_carry_security_headers() -> None:
    with api_client() as client:
        headers = client.get("/livez").headers
        assert headers["content-security-policy"] == "default-src 'none'; frame-ancestors 'none'"
        assert headers["x-content-type-options"] == "nosniff"
        assert headers["x-frame-options"] == "DENY"
        assert "strict-transport-security" not in headers  # production only


def test_malformed_json_is_a_400() -> None:
    with api_client() as client:
        res = client.post("/auth/login", content=b"{nope", headers={"content-type": "application/json"})
        assert res.status_code == 400
        assert res.json()["error"]["code"] == "BAD_REQUEST"


def test_a_non_json_body_is_415() -> None:
    with api_client() as client:
        res = client.post("/auth/login", content=b"email=a", headers={"content-type": "text/plain"})
        assert res.status_code == 415
        assert res.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_a_body_over_the_limit_is_413() -> None:
    with api_client() as client:
        res = client.post(
            "/auth/login", content=b'"' + b"x" * 300_000 + b'"', headers={"content-type": "application/json"}
        )
        assert res.status_code == 413
        assert res.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"


def test_health_checks_answer() -> None:
    with api_client() as client:
        assert client.get("/livez").json() == {"status": "ok"}
        assert client.get("/readyz").json() == {"status": "ok"}
