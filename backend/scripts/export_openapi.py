import json
import sys
from pathlib import Path

# プロジェクトルートをパスに追加
sys.path.append(str(Path(__file__).parent.parent))

from app.main import app

def export_openapi():
    """FastAPIアプリケーションからOpenAPIスキーマを出力する。"""
    openapi_data = app.openapi()
    
    # 出力先: backend/openapi.json
    output_path = Path(__file__).parent.parent / "openapi.json"
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_data, f, indent=2, ensure_ascii=False)
    
    print(f"OpenAPI schema exported to {output_path}")

if __name__ == "__main__":
    export_openapi()
