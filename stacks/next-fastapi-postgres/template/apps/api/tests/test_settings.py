import pytest

from app.settings import load_settings
from helpers import production_settings


def test_production_refuses_insecure_cookies() -> None:
    with pytest.raises(RuntimeError, match="COOKIE_SECURE must be true"):
        load_settings(APP_ENV="production", COOKIE_SECURE="false", WEB_ORIGIN="https://app.example.test")


def test_production_needs_an_https_web_origin() -> None:
    with pytest.raises(RuntimeError, match="WEB_ORIGIN must be https"):
        production_settings(WEB_ORIGIN="http://app.example.test")


def test_production_refuses_the_dev_mail_transport() -> None:
    with pytest.raises(RuntimeError, match="dev mail transport"):
        production_settings(MAIL_TRANSPORT="dev")


def test_production_refuses_the_placeholder_secret() -> None:
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        production_settings(SESSION_SECRET="change-me")


def test_production_defaults_to_the_log_mail_transport() -> None:
    assert production_settings().mail_transport == "log"


def test_trust_proxy_accepts_hops_and_networks_but_never_true() -> None:
    assert load_settings(TRUST_PROXY="1").TRUST_PROXY == 1
    assert load_settings(TRUST_PROXY="10.0.0.0/8, 127.0.0.1").TRUST_PROXY == ("10.0.0.0/8", "127.0.0.1")
    with pytest.raises(RuntimeError, match="TRUST_PROXY"):
        load_settings(TRUST_PROXY="true")


def test_the_session_secret_must_be_long() -> None:
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        load_settings(SESSION_SECRET="short")


def test_log_level_accepts_node_style_names() -> None:
    assert load_settings(LOG_LEVEL="warn").LOG_LEVEL == "warning"
    assert load_settings(LOG_LEVEL="INFO").LOG_LEVEL == "info"
