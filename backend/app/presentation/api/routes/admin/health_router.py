import os
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.presentation.api.deps import get_db


router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz():
    # アプリ起動のみ確認
    return {"status": "ok"}


@router.get("/readyz")
def readyz(db: Session = Depends(get_db)):
    # DB疎通確認
    db.execute(text("SELECT 1"))
    return {"status": "ready"}


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/env-check")
def env_check():
    """環境変数の読み込み状況を確認 (デバッグ用)."""

    def mask_sensitive(value: str, show_chars: int = 4) -> str:
        """機密情報をマスク."""
        if not value or len(value) <= show_chars:
            return "****"
        return f"{value[:show_chars]}...{value[-show_chars:]}"

    # .env ファイルの場所
    env_file = os.getenv("ENV_FILE", ".env")
    env_path = Path(env_file)

    # データベースURLのマスク
    db_url_masked = "Not set"
    if settings.DATABASE_URL:
        db_url = settings.DATABASE_URL
        if "@" in db_url:
            protocol, rest = db_url.split("://", 1)
            if "@" in rest:
                auth, location = rest.split("@", 1)
                if ":" in auth:
                    user, _ = auth.split(":", 1)
                    db_url_masked = f"{protocol}://{user}:****@{location}"
                else:
                    db_url_masked = db_url
            else:
                db_url_masked = db_url
        else:
            db_url_masked = db_url

    # 警告のチェック
    warnings = []
    if settings.secret_key == "dev-secret-key-change-in-production":
        warnings.append("SECRET_KEY is using default value (change required for production)")
    if settings.ENVIRONMENT != "production" and os.getenv("ENVIRONMENT") == "production":
        warnings.append(
            f"ENVIRONMENT mismatch (expected: production, actual: {settings.ENVIRONMENT})"
        )
    if not env_path.exists():
        warnings.append(f".env file not found: {env_path.absolute()}")
    if not settings.DATABASE_URL:
        warnings.append("DATABASE_URL is not set")

    return {
        "status": "ok" if not warnings else "warning",
        "environment": settings.ENVIRONMENT,
        "env_file": {
            "path": str(env_path.absolute()),
            "exists": env_path.exists(),
            "size_bytes": env_path.stat().st_size if env_path.exists() else None,
        },
        "config": {
            "database_url": db_url_masked,
            "database_url_set": bool(settings.DATABASE_URL),
            "secret_key": mask_sensitive(settings.secret_key),
            "secret_key_is_default": settings.secret_key == "dev-secret-key-change-in-production",
            "cors_origins_count": len(settings.CORS_ORIGINS)
            if isinstance(settings.CORS_ORIGINS, list)
            else 0,
            "log_level": settings.LOG_LEVEL,
        },
        "directories": {
            "upload_dir_exists": settings.UPLOAD_DIR.exists(),
            "log_dir_exists": settings.LOG_DIR.exists(),
        },
        "warnings": warnings,
    }
