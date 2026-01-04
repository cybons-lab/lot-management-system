"""Unit tests for admin authorization dependency."""

import pytest
from fastapi import HTTPException

from app.presentation.api.routes.auth.auth_router import get_current_admin


def test_get_current_admin_allows_admin(superuser):
    assert get_current_admin(superuser) == superuser


def test_get_current_admin_blocks_non_admin(normal_user):
    with pytest.raises(HTTPException) as exc:
        get_current_admin(normal_user)

    assert exc.value.status_code == 403
