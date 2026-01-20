#!/usr/bin/env python
"""出荷用マスタデータのダミーデータ生成スクリプト.

本番Excelが取得できないため、開発・テスト用のダミーデータを生成する。
"""

import sys
from datetime import datetime
from pathlib import Path

# プロジェクトルートをパスに追加
project_root = Path(__file__).parent / "backend"
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.infrastructure.persistence.models.shipping_master_models import (  # noqa: E402
    ShippingMasterCurated,
    ShippingMasterRaw,
)


def create_dummy_raw_data() -> list[dict]:
    """ダミー生データを生成."""
    data = []
    row_index = 2  # Excelのヘッダー行が1なので2から開始
    batch_id = f"DUMMY_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # 得意先 × 材質 × 次区 の組み合わせ
    customers = [
        ("C001", "テスト得意先A"),
        ("C002", "テスト得意先B"),
        ("C003", "テスト得意先C"),
    ]
    materials = [
        ("M001", "素材A-001", "PA-001", "MK-001"),
        ("M002", "素材B-002", "PA-002", "MK-002"),
        ("M003", "素材C-003", "PA-003", "MK-003"),
        ("M004", "素材D-004", "PA-004", "MK-004"),
    ]
    jiku_codes = [
        ("J01", "DP001", "納入先東京", "納入先東京工場"),
        ("J02", "DP002", "納入先大阪", "納入先大阪工場"),
        ("J03", "DP003", "納入先名古屋", "納入先名古屋工場"),
    ]
    warehouses = [
        ("W01", "東京倉庫"),
        ("W02", "大阪倉庫"),
    ]

    # 組み合わせを生成（全組み合わせではなく一部）
    combinations = [
        (0, 0, 0, 0),  # C001 x M001 x J01 x W01
        (0, 1, 0, 0),  # C001 x M002 x J01 x W01
        (0, 2, 1, 0),  # C001 x M003 x J02 x W01
        (1, 0, 0, 1),  # C002 x M001 x J01 x W02
        (1, 1, 1, 0),  # C002 x M002 x J02 x W01
        (1, 3, 2, 1),  # C002 x M004 x J03 x W02
        (2, 0, 0, 0),  # C003 x M001 x J01 x W01
        (2, 2, 1, 1),  # C003 x M003 x J02 x W02
        (2, 3, 2, 0),  # C003 x M004 x J03 x W01
    ]

    for c_idx, m_idx, j_idx, w_idx in combinations:
        cust = customers[c_idx]
        mat = materials[m_idx]
        jiku = jiku_codes[j_idx]
        wh = warehouses[w_idx]

        data.append(
            {
                "customer_code": cust[0],
                "material_code": mat[0],
                "jiku_code": jiku[0],
                "warehouse_code": wh[0],
                "delivery_note_product_name": mat[1],
                "customer_part_no": mat[2],
                "maker_part_no": mat[3],
                "order_flag": "○" if m_idx % 2 == 0 else "",
                "maker_code": f"MK{m_idx + 1:03d}",
                "maker_name": f"メーカー{m_idx + 1}",
                "supplier_code": f"S{(m_idx % 2) + 1:03d}",
                "staff_name": f"担当者{(c_idx % 3) + 1}",
                "delivery_place_abbr": jiku[2],
                "delivery_place_code": jiku[1],
                "delivery_place_name": jiku[3],
                "shipping_warehouse": wh[1],
                "shipping_slip_text": f"{cust[0]}/{mat[0]}/ロット番号(数量)",
                "transport_lt_days": 2 + j_idx,  # 2〜4営業日
                "order_existence": "有" if m_idx % 2 == 0 else "無",
                "remarks": f"テスト備考 {cust[0]}-{mat[0]}",
                "row_index": row_index,
                "import_batch_id": batch_id,
            }
        )
        row_index += 1

    return data


def create_curated_from_raw(raw_data: list[dict]) -> list[dict]:
    """生データから整形済みデータを生成."""
    curated = []

    for raw in raw_data:
        curated.append(
            {
                "customer_code": raw["customer_code"],
                "material_code": raw["material_code"],
                "jiku_code": raw["jiku_code"],
                "warehouse_code": raw["warehouse_code"],
                "customer_name": f"得意先名_{raw['customer_code']}",
                "delivery_note_product_name": raw["delivery_note_product_name"],
                "customer_part_no": raw["customer_part_no"],
                "maker_part_no": raw["maker_part_no"],
                "maker_code": raw["maker_code"],
                "maker_name": raw["maker_name"],
                "supplier_code": raw["supplier_code"],
                "supplier_name": f"仕入先名_{raw['supplier_code']}",
                "delivery_place_code": raw["delivery_place_code"],
                "delivery_place_name": raw["delivery_place_name"],
                "shipping_warehouse_code": raw["warehouse_code"],
                "shipping_warehouse_name": raw["shipping_warehouse"],
                "shipping_slip_text": raw["shipping_slip_text"],
                "transport_lt_days": raw["transport_lt_days"],
                "has_order": raw["order_flag"] == "○",
                "remarks": raw["remarks"],
                "has_duplicate_warning": False,
            }
        )

    return curated


def seed_dummy_data(db_url: str | None = None):
    """ダミーデータをDBに投入."""
    import os

    if db_url is None:
        db_url = os.getenv(
            "DATABASE_URL",
            "postgresql://lot_user:lot_pass@localhost:5432/lot_management",
        )

    engine = create_engine(db_url)
    session = Session(engine)

    try:
        # 既存データを確認
        existing_count = session.query(ShippingMasterCurated).count()
        if existing_count > 0:
            print(f"既存データが{existing_count}件あります。スキップします。")
            print("強制的に再投入する場合は、先にテーブルをクリアしてください。")
            return

        # 生データ作成
        raw_data = create_dummy_raw_data()
        for row in raw_data:
            session.add(ShippingMasterRaw(**row))
        session.flush()

        print(f"生データ {len(raw_data)} 件を投入しました。")

        # 整形済みデータ作成
        curated_data = create_curated_from_raw(raw_data)
        raw_records = session.query(ShippingMasterRaw).all()
        raw_id_map = {
            (r.customer_code, r.material_code, r.jiku_code): r.id for r in raw_records
        }

        for cur in curated_data:
            key = (cur["customer_code"], cur["material_code"], cur["jiku_code"])
            cur["raw_id"] = raw_id_map.get(key)
            session.add(ShippingMasterCurated(**cur))

        session.commit()
        print(f"整形済みデータ {len(curated_data)} 件を投入しました。")
        print("ダミーデータ投入完了！")

    except Exception as e:
        session.rollback()
        print(f"エラー発生: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_dummy_data()
