"""OCR受注登録結果の確認用スクリプト.

DB内の order_register_rows テーブルの内容を読みやすく出力します。
"""

import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.infrastructure.persistence.models.shipping_master_models import OrderRegisterRow

# データベース接続設定
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:dev_password@localhost:5432/lot_management")

def main():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        stmt = select(OrderRegisterRow).order_by(OrderRegisterRow.task_date.desc(), OrderRegisterRow.id.desc())
        rows = session.execute(stmt).scalars().all()

        if not rows:
            print("データが見つかりませんでした。")
            return

        print(f"{'ID':<4} | {'タスク日':<10} | {'納期':<10} | {'出荷日':<10} | {'納入量':<6} | {'材質コード':<15} | {'得意先':<15} | {'状態':<10}")
        print("-" * 100)

        for r in rows:
            print(f"{r.id:<4} | {str(r.task_date):<10} | {str(r.delivery_date):<10} | {str(r.shipping_date):<10} | {str(r.delivery_quantity):<6} | {str(r.material_code):<15} | {str(r.customer_name or r.customer_code):<15} | {r.status:<10}")

    except Exception as e:
        print(f"エラーが発生しました: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    main()
