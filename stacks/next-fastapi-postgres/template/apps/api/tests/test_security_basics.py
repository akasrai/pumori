import json
import logging

from app.lib.logging_setup import JsonFormatter, redact_url
from app.lib.password import PASSWORD_PARAMS, ScryptParams, hash_password, needs_rehash, verify_password


def test_passwords_round_trip_and_never_store_the_plain_text() -> None:
    stored = hash_password("correct horse battery staple")
    assert "correct horse" not in stored
    assert verify_password("correct horse battery staple", stored)
    assert not verify_password("wrong", stored)
    assert not verify_password("anything", "garbage")


def test_old_parameters_need_a_rehash() -> None:
    weak = hash_password("pw", ScryptParams(n=2**10, r=8, p=1))
    assert needs_rehash(weak)
    assert verify_password("pw", weak)
    assert not needs_rehash(hash_password("pw", PASSWORD_PARAMS))


def test_logs_redact_secrets_and_query_strings() -> None:
    record = logging.makeLogRecord({"msg": "x", "cookie": "sid=abc", "password": "pw", "user": "u1"})
    line = json.loads(JsonFormatter().format(record))
    assert line["cookie"] == "[redacted]"
    assert line["password"] == "[redacted]"
    assert line["user"] == "u1"
    assert redact_url("/reset?token=abc") == "/reset"
