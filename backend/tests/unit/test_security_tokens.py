# backend/tests/unit/test_security_tokens.py
"""Unit tests for JWT token utilities."""

from datetime import timedelta

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)


def test_create_and_decode_access_token_round_trip():
    token = create_access_token(data={"sub": "123", "username": "tester"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "123"
    assert payload["typ"] == "access"


def test_access_token_rejects_refresh_token():
    refresh_token = create_refresh_token(data={"sub": "123"})
    assert decode_access_token(refresh_token) is None


def test_refresh_token_rejects_access_token():
    access_token = create_access_token(data={"sub": "123"})
    assert decode_refresh_token(access_token) is None


def test_refresh_token_expired_returns_none():
    expired_token = create_refresh_token(data={"sub": "123"}, expires_delta=timedelta(minutes=-1))
    assert decode_refresh_token(expired_token) is None


def test_access_token_invalid_returns_none():
    assert decode_access_token("invalid.token.value") is None
