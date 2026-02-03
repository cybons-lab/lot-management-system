"""Security utilities (JWT).

【設計意図】JWT認証の設定値について:

1. ACCESS_TOKEN_EXPIRE_MINUTES（デフォルト: 30分、環境変数で変更）
   理由: 在庫管理システムの業務特性
   - 営業担当者は終日システムを使用
   - 頻繁なログイン要求はユーザビリティを損なう
   → 1日有効なトークンで業務を継続できる

   セキュリティとの兼ね合い:
   - 短期: セキュアだが、ユーザーの手間が増える
   - 長期: 便利だが、トークン盗難のリスク
   → 社内システムかつVPN経由のため、1日は許容範囲

   併用:
   - リフレッシュトークン機構を導入済み

2. デフォルトは settings.access_token_expire_minutes（create_access_token内）
   用途: 特定の短期操作用（パスワードリセット等）
   → 通常のログインでは明示的に1日を指定

3. SECRET_KEY（開発用ハードコード）
   注意: 本番環境では必ず環境変数から読み込むこと
   → 現状は開発の利便性を優先
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt  # PyJWT

from app.core.config import settings


def _create_token(
    data: dict,
    expires_delta: timedelta | None,
    token_type: str,
    default_minutes: int,
) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=default_minutes)

    to_encode.update({"exp": expire, "typ": token_type})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return str(encoded_jwt)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token."""
    return _create_token(
        data,
        expires_delta=expires_delta,
        token_type="access",
        default_minutes=settings.access_token_expire_minutes,
    )


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT refresh token."""
    return _create_token(
        data,
        expires_delta=expires_delta,
        token_type="refresh",
        default_minutes=settings.refresh_token_expire_minutes,
    )


def _decode_token(token: str) -> dict[str, Any] | None:
    """Decode and verify JWT."""
    try:
        payload: dict[str, Any] = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        return payload
    except jwt.PyJWTError:
        return None


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify access token."""
    payload = _decode_token(token)
    if not payload:
        return None
    token_type = payload.get("typ")
    if token_type and token_type != "access":
        return None
    return payload


def decode_refresh_token(token: str) -> dict[str, Any] | None:
    """Decode and verify refresh token."""
    payload = _decode_token(token)
    if not payload:
        return None
    if payload.get("typ") != "refresh":
        return None
    return payload
