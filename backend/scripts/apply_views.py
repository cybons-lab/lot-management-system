#!/usr/bin/env python3
"""
ビュー作成スクリプト

このスクリプトは、データベースビューを作成するためのクロスプラットフォーム対応ツールです。
Alembicマイグレーション実行後に、このスクリプトを実行してビューを作成してください。

Usage:
    python backend/scripts/apply_views.py
    
    または環境変数でDATABASE_URLを指定:
    DATABASE_URL="postgresql://user:pass@host:port/dbname" python backend/scripts/apply_views.py
"""

import os
import sys
from pathlib import Path

# プロジェクトルートをパスに追加
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "backend"))

try:
    from sqlalchemy import create_engine, text
    from app.core.config import settings
except ImportError:
    print("❌ 必要なパッケージがインストールされていません")
    print("   以下のコマンドでインストールしてください:")
    print("   pip install sqlalchemy psycopg2-binary python-dotenv pydantic pydantic-settings")
    sys.exit(1)


def get_database_url():
    """データベースURLを取得"""
    # 環境変数から取得を試みる
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        # settings から取得
        database_url = str(settings.DATABASE_URL)
    
    if not database_url or database_url == "":
        print("❌ DATABASE_URLが設定されていません")
        print("   .envファイルまたは環境変数でDATABASE_URLを設定してください")
        print("")
        print("   例: DATABASE_URL=postgresql://admin:dev_password@localhost:5432/lot_management")
        sys.exit(1)
    
    return database_url


def apply_views():
    """ビュー作成SQLを実行"""
    
    # ビューSQLファイルのパス
    views_sql_path = project_root / "backend" / "views" / "create_views.sql"
    
    if not views_sql_path.exists():
        print(f"❌ ビューSQLファイルが見つかりません: {views_sql_path}")
        sys.exit(1)
    
    # DATABASE_URLを取得
    database_url = get_database_url()
    
    print("="*60)
    print("🔧 データベースビュー作成スクリプト")
    print("="*60)
    print(f"📁 SQLファイル: {views_sql_path}")
    print(f"🗄️  データベース: {database_url.split('@')[-1] if '@' in database_url else database_url}")
    print()
    
    try:
        # データベースエンジン作成
        engine = create_engine(database_url)
        
        # SQLファイル読み込み
        with open(views_sql_path, "r", encoding="utf-8") as f:
            sql_content = f.read()
        
        # SQL実行
        print("⏳ ビューを作成中...")
        with engine.begin() as conn:
            # PostgreSQLのNOTICEメッセージを表示するため、個別に実行
            conn.execute(text(sql_content))
        
        print()
        print("="*60)
        print("✅ ビューの作成が完了しました")
        print("="*60)
        print()
        print("作成されたビュー:")
        print("  1. v_lot_current_stock")
        print("  2. v_customer_daily_products")
        print("  3. v_lot_available_qty")
        print("  4. v_order_line_context")
        print("  5. v_customer_code_to_id")
        print("  6. v_delivery_place_code_to_id")
        print("  7. v_forecast_order_pairs")
        print("  8. v_product_code_to_id")
        print("  9. v_candidate_lots_by_order_line")
        print(" 10. v_order_line_details")
        print(" 11. v_inventory_summary")
        print(" 12. v_lot_details")
        print()
        
    except Exception as e:
        print()
        print("="*60)
        print("❌ エラーが発生しました")
        print("="*60)
        print(f"エラー内容: {e}")
        print()
        sys.exit(1)


if __name__ == "__main__":
    apply_views()
