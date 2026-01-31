"""出荷用マスタテストデータ生成.

SmartReadの横持ちデータとキーが一致するように設計。
キー: 得意先コード × 材質コード × 次区
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.shipping_master_models import (
    ShippingMasterCurated,
    ShippingMasterRaw,
)


# OrderRegisterServiceと同じデフォルト値
DEFAULT_CUSTOMER_CODE = "100427105"


def clear_shipping_master_data(db: Session) -> None:
    """出荷用マスタデータをクリア."""
    db.query(ShippingMasterCurated).delete()
    db.query(ShippingMasterRaw).delete()


def generate_shipping_master_data(db: Session) -> None:
    """出荷用マスタテストデータを生成.

    横持ちデータ（smartread.py）とキーが一致するように設計。
    """
    # 既存データをクリア
    clear_shipping_master_data(db)

    batch_id = f"TEST_{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"

    # 材質 × 次区 の組み合わせ（得意先は固定）
    # smartread.pyのパターンと一致させる
    master_data = [
        # Pattern A, B: 基本パターン
        {
            "customer_code": DEFAULT_CUSTOMER_CODE,
            "material_code": "M001",
            "jiku_code": "J01",
            "warehouse_code": "W01",
            "customer_name": f"得意先名_{DEFAULT_CUSTOMER_CODE}",
            "delivery_note_product_name": "素材A-001",
            "customer_part_no": "PA-001",
            "maker_part_no": "MK-001",
            "maker_code": "MK001",
            "maker_name": "メーカー1",
            "supplier_code": "S001",
            "supplier_name": "仕入先名_S001",
            "delivery_place_code": "DP001",
            "delivery_place_name": "納入先東京工場",
            "shipping_warehouse_code": "W01",
            "shipping_warehouse_name": "東京倉庫",
            "shipping_slip_text": f"{DEFAULT_CUSTOMER_CODE}/M001/ロット",
            "transport_lt_days": 2,
        },
        {
            "customer_code": DEFAULT_CUSTOMER_CODE,
            "material_code": "M002",
            "jiku_code": "J01",
            "warehouse_code": "W01",
            "customer_name": f"得意先名_{DEFAULT_CUSTOMER_CODE}",
            "delivery_note_product_name": "素材B-002",
            "customer_part_no": "PA-002",
            "maker_part_no": "MK-002",
            "maker_code": "MK002",
            "maker_name": "メーカー2",
            "supplier_code": "S002",
            "supplier_name": "仕入先名_S002",
            "delivery_place_code": "DP001",
            "delivery_place_name": "納入先東京工場",
            "shipping_warehouse_code": "W01",
            "shipping_warehouse_name": "東京倉庫",
            "shipping_slip_text": f"{DEFAULT_CUSTOMER_CODE}/M002/ロット",
            "transport_lt_days": 2,
        },
        # Pattern C: 別の次区
        {
            "customer_code": DEFAULT_CUSTOMER_CODE,
            "material_code": "M003",
            "jiku_code": "J02",
            "warehouse_code": "W02",
            "customer_name": f"得意先名_{DEFAULT_CUSTOMER_CODE}",
            "delivery_note_product_name": "素材C-003",
            "customer_part_no": "PA-003",
            "maker_part_no": "MK-003",
            "maker_code": "MK003",
            "maker_name": "メーカー3",
            "supplier_code": "S001",
            "supplier_name": "仕入先名_S001",
            "delivery_place_code": "DP002",
            "delivery_place_name": "納入先大阪工場",
            "shipping_warehouse_code": "W02",
            "shipping_warehouse_name": "大阪倉庫",
            "shipping_slip_text": f"{DEFAULT_CUSTOMER_CODE}/M003/ロット",
            "transport_lt_days": 3,
        },
        # Pattern D: 別の材質
        {
            "customer_code": DEFAULT_CUSTOMER_CODE,
            "material_code": "M004",
            "jiku_code": "J01",
            "warehouse_code": "W01",
            "customer_name": f"得意先名_{DEFAULT_CUSTOMER_CODE}",
            "delivery_note_product_name": "素材D-004",
            "customer_part_no": "PA-004",
            "maker_part_no": "MK-004",
            "maker_code": "MK004",
            "maker_name": "メーカー4",
            "supplier_code": "S002",
            "supplier_name": "仕入先名_S002",
            "delivery_place_code": "DP001",
            "delivery_place_name": "納入先東京工場",
            "shipping_warehouse_code": "W01",
            "shipping_warehouse_name": "東京倉庫",
            "shipping_slip_text": f"{DEFAULT_CUSTOMER_CODE}/M004/ロット",
            "transport_lt_days": 2,
        },
        # 追加パターン: 複数倉庫/次区の組み合わせ
        {
            "customer_code": DEFAULT_CUSTOMER_CODE,
            "material_code": "M001",
            "jiku_code": "J02",
            "warehouse_code": "W02",
            "customer_name": f"得意先名_{DEFAULT_CUSTOMER_CODE}",
            "delivery_note_product_name": "素材A-001",
            "customer_part_no": "PA-001",
            "maker_part_no": "MK-001",
            "maker_code": "MK001",
            "maker_name": "メーカー1",
            "supplier_code": "S001",
            "supplier_name": "仕入先名_S001",
            "delivery_place_code": "DP002",
            "delivery_place_name": "納入先大阪工場",
            "shipping_warehouse_code": "W02",
            "shipping_warehouse_name": "大阪倉庫",
            "shipping_slip_text": f"{DEFAULT_CUSTOMER_CODE}/M001/ロット",
            "transport_lt_days": 3,
        },
    ]

    for i, data in enumerate(master_data, start=2):
        # 生データ作成
        raw = ShippingMasterRaw(
            customer_code=data["customer_code"],
            material_code=data["material_code"],
            jiku_code=data["jiku_code"],
            warehouse_code=data["warehouse_code"],
            delivery_note_product_name=data["delivery_note_product_name"],
            customer_part_no=data["customer_part_no"],
            maker_part_no=data["maker_part_no"],
            order_flag="○" if i % 2 == 0 else "",
            maker_code=data["maker_code"],
            maker_name=data["maker_name"],
            supplier_code=data["supplier_code"],
            staff_name=f"担当者{i % 3 + 1}",
            delivery_place_abbr=str(data["delivery_place_name"])[:10],
            delivery_place_code=data["delivery_place_code"],
            delivery_place_name=data["delivery_place_name"],
            shipping_warehouse=data["shipping_warehouse_name"],
            shipping_slip_text=data["shipping_slip_text"],
            transport_lt_days=data["transport_lt_days"],
            order_existence="有" if i % 2 == 0 else "無",
            remarks=f"テスト備考 {data['material_code']}",
            row_index=i,
            import_batch_id=batch_id,
        )
        db.add(raw)
        db.flush()

        # 整形済みデータ作成
        curated = ShippingMasterCurated(
            raw_id=raw.id,
            customer_code=data["customer_code"],
            material_code=data["material_code"],
            jiku_code=data["jiku_code"],
            warehouse_code=data["warehouse_code"],
            customer_name=data["customer_name"],
            delivery_note_product_name=data["delivery_note_product_name"],
            customer_part_no=data["customer_part_no"],
            maker_part_no=data["maker_part_no"],
            maker_code=data["maker_code"],
            maker_name=data["maker_name"],
            supplier_code=data["supplier_code"],
            supplier_name=data["supplier_name"],
            delivery_place_code=data["delivery_place_code"],
            delivery_place_name=data["delivery_place_name"],
            shipping_warehouse_code=data["shipping_warehouse_code"],
            shipping_warehouse_name=data["shipping_warehouse_name"],
            shipping_slip_text=data["shipping_slip_text"],
            transport_lt_days=data["transport_lt_days"],
            has_order=i % 2 == 0,
            remarks=f"テスト備考 {data['material_code']}",
            has_duplicate_warning=False,
        )
        db.add(curated)
