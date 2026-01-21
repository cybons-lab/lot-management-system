#!/usr/bin/env python3
"""本番環境で .env ファイルが正しく読み込まれているか確認するスクリプト."""

import sys
from pathlib import Path


# プロジェクトルートをパスに追加
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings


def mask_sensitive(value: str, show_chars: int = 4) -> str:
    """機密情報をマスクする."""
    if not value or len(value) <= show_chars:
        return "****"
    return f"{value[:show_chars]}...{value[-show_chars:]}"


def check_env_loading():
    """環境変数の読み込み状況を確認."""
    print("=" * 60)
    print("環境変数読み込み確認")
    print("=" * 60)
    print()

    # 1. 基本設定
    print("【基本設定】")
    print(f"  ENVIRONMENT: {settings.ENVIRONMENT}")
    print(f"  APP_NAME: {settings.APP_NAME}")
    print(f"  APP_VERSION: {settings.APP_VERSION}")
    print()

    # 2. データベース設定
    print("【データベース設定】")
    if settings.DATABASE_URL:
        # URLからパスワード部分をマスク
        db_url = settings.DATABASE_URL
        if "@" in db_url:
            # postgresql://user:password@host:port/db の形式
            protocol, rest = db_url.split("://", 1)
            if "@" in rest:
                auth, location = rest.split("@", 1)
                if ":" in auth:
                    user, password = auth.split(":", 1)
                    masked_url = f"{protocol}://{user}:****@{location}"
                else:
                    masked_url = db_url
            else:
                masked_url = db_url
        else:
            masked_url = db_url
        print(f"  DATABASE_URL: {masked_url}")
        print("  ✅ データベースURL設定済み")
    else:
        print("  DATABASE_URL: (未設定)")
        print("  ❌ データベースURLが設定されていません!")
    print()

    # 3. CORS設定
    print("【CORS設定】")
    print(f"  CORS_ORIGINS: {settings.CORS_ORIGINS}")
    if isinstance(settings.CORS_ORIGINS, list) and len(settings.CORS_ORIGINS) > 0:
        print(f"  ✅ CORSオリジン設定済み ({len(settings.CORS_ORIGINS)}件)")
    else:
        print("  ⚠️  CORSオリジンが設定されていません")
    print()

    # 4. JWT設定
    print("【JWT設定】")
    print(f"  SECRET_KEY: {mask_sensitive(settings.secret_key)}")
    print(f"  ALGORITHM: {settings.algorithm}")
    print(f"  ACCESS_TOKEN_EXPIRE_MINUTES: {settings.access_token_expire_minutes}")
    if settings.secret_key == "dev-secret-key-change-in-production":
        print("  ⚠️  SECRET_KEYがデフォルト値のままです! 本番環境では必ず変更してください!")
    else:
        print("  ✅ SECRET_KEYがカスタム値に設定されています")
    print()

    # 5. ログ設定
    print("【ログ設定】")
    print(f"  LOG_LEVEL: {settings.LOG_LEVEL}")
    print(f"  LOG_FILE_ENABLED: {settings.LOG_FILE_ENABLED}")
    print(f"  LOG_JSON_FORMAT: {settings.LOG_JSON_FORMAT}")
    print(f"  LOG_DIR: {settings.LOG_DIR}")
    print()

    # 6. その他の設定
    print("【その他の設定】")
    print(f"  DEFAULT_WAREHOUSE_ID: {settings.DEFAULT_WAREHOUSE_ID}")
    print(f"  UPLOAD_DIR: {settings.UPLOAD_DIR}")
    print(f"  MAX_UPLOAD_SIZE: {settings.MAX_UPLOAD_SIZE / 1024 / 1024:.1f}MB")
    print()

    # 7. ディレクトリの存在確認
    print("【ディレクトリ確認】")
    print(f"  UPLOAD_DIR exists: {settings.UPLOAD_DIR.exists()}")
    print(f"  LOG_DIR exists: {settings.LOG_DIR.exists()}")
    print()

    # 8. .env ファイルの場所
    print("【.env ファイル情報】")
    import os

    env_file = os.getenv("ENV_FILE", ".env")
    print(f"  ENV_FILE環境変数: {env_file}")
    env_path = Path(env_file)
    if env_path.exists():
        print(f"  ✅ .envファイルが見つかりました: {env_path.absolute()}")
        print(f"  ファイルサイズ: {env_path.stat().st_size} bytes")
    else:
        print(f"  ❌ .envファイルが見つかりません: {env_path.absolute()}")
    print()

    # 9. 総合判定
    print("=" * 60)
    print("【総合判定】")
    print("=" * 60)

    issues = []

    if not settings.DATABASE_URL:
        issues.append("❌ DATABASE_URLが設定されていません")

    if settings.secret_key == "dev-secret-key-change-in-production":
        issues.append("⚠️  SECRET_KEYがデフォルト値です (本番環境では変更必須)")

    if settings.ENVIRONMENT != "production":
        issues.append(f"⚠️  ENVIRONMENTが本番環境ではありません (現在: {settings.ENVIRONMENT})")

    if not env_path.exists():
        issues.append(f"❌ .envファイルが見つかりません: {env_path.absolute()}")

    if issues:
        print("以下の問題が見つかりました:")
        for issue in issues:
            print(f"  {issue}")
        return 1
    else:
        print("✅ 全ての設定が正しく読み込まれています!")
        return 0


if __name__ == "__main__":
    sys.exit(check_env_loading())
