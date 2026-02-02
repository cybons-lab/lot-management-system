import json
import logging
import os
import sys
from pathlib import Path


# プロジェクトルートをパスに追加
sys.path.append(str(Path(__file__).parent.parent))

# DB接続が必要ないため、ダミーのURLを設定してcreate_engineのエラーを回避
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

# ログ出力を抑制してOpenAPIスキーマ生成への混入を防ぐ
logging.disable(logging.CRITICAL)
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

from app.main import app  # noqa: E402


def export_openapi():
    """Export OpenAPI schema from FastAPI application."""
    openapi_data = app.openapi()

    # 出力先: backend/openapi.json
    output_path = Path(__file__).parent.parent / "openapi.json"

    # ルート定義が存在するか確認
    if not openapi_data.get("paths"):
        print(
            "Error: No paths found in OpenAPI schema. Application might not remain initialized correctly."
        )
        sys.exit(1)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_data, f, indent=2, ensure_ascii=False)

    print(f"OpenAPI schema exported to {output_path}")


if __name__ == "__main__":
    export_openapi()
