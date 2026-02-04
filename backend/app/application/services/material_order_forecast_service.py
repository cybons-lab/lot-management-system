"""Material Order Forecast Service.

材料発注フォーキャストのCSVインポート・取得サービス。
"""

import json
import logging
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from typing import BinaryIO

import pandas as pd
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    CustomerItem,
    Maker,
    MaterialOrderForecast,
    Warehouse,
)


logger = logging.getLogger(__name__)


class MaterialOrderForecastService:
    """Material Order Forecast service."""

    def __init__(self, db: Session):
        self.db = db

    def import_from_csv(
        self,
        file: BinaryIO,
        target_month: str | None = None,
        user_id: int | None = None,
        filename: str | None = None,
    ) -> dict:
        """
        CSVファイルをインポートして material_order_forecasts に保存.

        Args:
            file: CSV file (ヘッダーなし、1行目からデータ)
            target_month: 対象月（YYYY-MM形式、省略時はCSV A列から取得）
            user_id: インポート実行ユーザーID
            filename: 元ファイル名

        Returns:
            {
                "success": True,
                "imported_count": 150,
                "target_month": "2026-02",
                "snapshot_at": "2026-02-04T23:00:00",
                "warnings": ["メーカーコード 'XYZ' がマスタに見つかりません"]
            }
        """
        logger.info("Starting CSV import", extra={"source_file": filename, "user_id": user_id})

        try:
            # Step 1: CSV読み込み（ヘッダーなし）
            df = pd.read_csv(
                BytesIO(file.read()) if isinstance(file, BytesIO) else file,
                header=None,
                dtype=str,
                keep_default_na=False,
            )

            if df.empty:
                raise ValueError("CSVファイルが空です")

            logger.info(f"CSV loaded: {len(df)} rows, {len(df.columns)} columns")

            # Step 2: 対象月を決定（YYYYMM → YYYY-MM）
            if target_month:
                # 手動指定
                pass
            else:
                # CSV A列から取得
                target_month_raw = df.iloc[0, 0]  # A列の先頭行
                if len(target_month_raw) == 6 and target_month_raw.isdigit():
                    target_month = f"{target_month_raw[:4]}-{target_month_raw[4:6]}"
                else:
                    raise ValueError(
                        f"対象月の形式が不正です（期待: YYYYMM、実際: {target_month_raw}）"
                    )

            logger.info(f"Target month: {target_month}")

            # Step 2.5: 次区コードの必須チェック（E列）
            if len(df.columns) <= 4:
                raise ValueError("CSV列数が不足しています（次区コード列が存在しません）")

            jiku_series = df.iloc[:, 4].fillna("").astype(str).str.strip()
            missing_jiku = jiku_series == ""
            if missing_jiku.any():
                row_numbers = (df.index[missing_jiku] + 1).tolist()
                sample_rows = ", ".join(str(num) for num in row_numbers[:5])
                raise ValueError(f"次区コードが空の行があります（行: {sample_rows}）")

            # Step 3: 数量列を数値化（L-Q列のうちO列は除外 + R-AX列）
            # O列（担当者名）は文字列なので数値化しない
            qty_col_indices = [11, 12, 13, 15, 16] + list(range(17, 60))
            for col_idx in qty_col_indices:
                if col_idx < len(df.columns):
                    df.iloc[:, col_idx] = pd.to_numeric(df.iloc[:, col_idx], errors="coerce")

            # Step 4: 日別・期間別数量をJSON化
            df = self._create_quantity_json(df)

            # Step 5: 既存マスタ引当
            df, warnings = self._enrich_with_masters(df)

            # Step 6: DB保存
            imported_count = self._save_to_db(df, target_month, user_id, filename)

            snapshot_at = datetime.now()
            logger.info(
                "CSV import completed",
                extra={"imported_count": imported_count, "warnings": len(warnings)},
            )

            return {
                "success": True,
                "imported_count": imported_count,
                "target_month": target_month,
                "snapshot_at": snapshot_at.isoformat(),
                "warnings": warnings,
            }

        except Exception as e:
            logger.exception("CSV import failed", extra={"error": str(e)})
            raise

    def _create_quantity_json(self, df: pd.DataFrame) -> pd.DataFrame:
        """日別・期間別数量をJSON化."""
        daily_quantities_list = []
        period_quantities_list = []

        for _, row in df.iterrows():
            # 日別数量（R-AL列 = 17-47、1-31日）
            daily = {}
            for day in range(1, 32):
                col_idx = 17 + day - 1  # R列(17)から
                if col_idx < len(row):
                    val = row.iloc[col_idx]
                    if pd.notna(val) and val != "":
                        try:
                            daily[str(day)] = float(val)
                        except (ValueError, TypeError):
                            pass
            daily_quantities_list.append(json.dumps(daily) if daily else None)

            # 期間別数量（AM-AX列 = 48-59、1-10 + 中旬 + 下旬）
            period = {}
            period_labels = [str(i) for i in range(1, 11)] + ["中旬", "下旬"]
            for i, label in enumerate(period_labels):
                col_idx = 48 + i  # AM列(48)から
                if col_idx < len(row):
                    val = row.iloc[col_idx]
                    if pd.notna(val) and val != "":
                        try:
                            period[label] = float(val)
                        except (ValueError, TypeError):
                            pass
            period_quantities_list.append(json.dumps(period) if period else None)

        df["daily_quantities_json"] = daily_quantities_list
        df["period_quantities_json"] = period_quantities_list

        return df

    def _enrich_with_masters(self, df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
        """既存マスタ引当（LEFT JOIN用）."""
        warnings = []

        # 1. 得意先品番マスタ引当（customer_items）
        customer_item_map = {
            ci.customer_part_no: ci.id
            for ci in self.db.query(CustomerItem).filter(CustomerItem.valid_to >= date.today())
        }
        df["customer_item_id"] = df.iloc[:, 1].map(customer_item_map)  # B列（材質コード）
        df["customer_item_id"] = df["customer_item_id"].where(
            pd.notna(df["customer_item_id"]), None
        )

        missing_material = df[df["customer_item_id"].isna()].iloc[:, 1].unique()
        if len(missing_material) > 0:
            warnings.append(
                f"得意先品番マスタに見つからないコード: {', '.join(str(x) for x in missing_material[:5])}"
            )

        # 2. メーカーマスタ引当（makers）
        maker_map = {
            m.maker_code: m.id for m in self.db.query(Maker).filter(Maker.valid_to >= date.today())
        }
        df["maker_id"] = df.iloc[:, 8].map(maker_map)  # I列（メーカーコード）
        df["maker_id"] = df["maker_id"].where(pd.notna(df["maker_id"]), None)

        missing_makers = df[df["maker_id"].isna()].iloc[:, 8].unique()
        if len(missing_makers) > 0:
            warnings.append(
                f"メーカーマスタに見つからないコード: {', '.join(str(x) for x in missing_makers[:5])}"
            )

        # 3. 倉庫マスタ引当（warehouses）
        warehouse_map = {
            w.warehouse_code: w.id
            for w in self.db.query(Warehouse).filter(Warehouse.valid_to >= date.today())
        }
        df["warehouse_id"] = df.iloc[:, 3].map(warehouse_map)  # D列（倉庫）
        df["warehouse_id"] = df["warehouse_id"].where(pd.notna(df["warehouse_id"]), None)

        missing_warehouses = df[df["warehouse_id"].isna()].iloc[:, 3].unique()
        if len(missing_warehouses) > 0:
            warnings.append(
                f"倉庫マスタに見つからないコード: {', '.join(str(x) for x in missing_warehouses[:5])}"
            )

        logger.info(f"Master enrichment completed with {len(warnings)} warnings")
        return df, warnings

    def _save_to_db(
        self, df: pd.DataFrame, target_month: str, user_id: int | None, filename: str | None
    ) -> int:
        """DataFrameをDBに保存."""
        imported_count = 0

        # IDカラムのクレンジング用ヘルパー
        def clean_id(val):
            if pd.isna(val) or val == "":
                return None
            return int(val)

        for idx, row in df.iterrows():
            try:
                # 既存レコードを削除（UPSERT）
                material_code = str(row.iloc[1]) if pd.notna(row.iloc[1]) else None
                jiku_code = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else ""
                maker_code = str(row.iloc[8]) if pd.notna(row.iloc[8]) else None

                self.db.query(MaterialOrderForecast).filter(
                    MaterialOrderForecast.target_month == target_month,
                    MaterialOrderForecast.material_code == material_code,
                    MaterialOrderForecast.jiku_code == jiku_code,
                    MaterialOrderForecast.maker_code == maker_code,
                ).delete()

                # 新規レコード作成
                forecast = MaterialOrderForecast(
                    target_month=target_month,
                    # FK（LEFT JOIN結果）
                    customer_item_id=clean_id(row.get("customer_item_id")),
                    warehouse_id=clean_id(row.get("warehouse_id")),
                    maker_id=clean_id(row.get("maker_id")),
                    # CSV生データ
                    material_code=material_code,
                    unit=row.iloc[2] or None,  # C列
                    warehouse_code=row.iloc[3] or None,  # D列
                    jiku_code=jiku_code,  # E列（必須）
                    delivery_place=row.iloc[5] or None,  # F列
                    support_division=row.iloc[6] or None,  # G列
                    procurement_type=row.iloc[7] or None,  # H列
                    maker_code=maker_code,  # I列
                    maker_name=row.iloc[9] or None,  # J列
                    material_name=row.iloc[10] or None,  # K列
                    # 数量データ
                    delivery_lot=self._to_decimal(row.iloc[11]),  # L列
                    order_quantity=self._to_decimal(row.iloc[12]),  # M列
                    month_start_instruction=self._to_decimal(row.iloc[13]),  # N列
                    manager_name=row.iloc[14] or None,  # O列
                    monthly_instruction_quantity=self._to_decimal(row.iloc[15]),  # P列
                    next_month_notice=self._to_decimal(row.iloc[16]),  # Q列
                    # JSON数量
                    daily_quantities=json.loads(row["daily_quantities_json"])
                    if row["daily_quantities_json"]
                    else None,
                    period_quantities=json.loads(row["period_quantities_json"])
                    if row["period_quantities_json"]
                    else None,
                    # メタ情報
                    imported_by=user_id,
                    source_file_name=filename,
                )
                self.db.add(forecast)
                imported_count += 1

            except Exception as e:
                logger.error(
                    f"Failed to save row {idx}",
                    extra={"error": str(e), "row": row.to_dict()},
                )
                raise

        self.db.commit()
        logger.info(f"Saved {imported_count} records to DB")
        return imported_count

    @staticmethod
    def _to_decimal(value) -> Decimal | None:
        """数値をDecimalに変換（NA/空は None）."""
        if pd.isna(value) or value == "":
            return None
        try:
            return Decimal(str(value))
        except (ValueError, TypeError):
            return None

    def get_forecasts(
        self,
        target_month: str | None = None,
        material_code: str | None = None,
        maker_code: str | None = None,
        jiku_code: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[MaterialOrderForecast]:
        """フォーキャストデータを取得（フィルタリング付き）."""
        query = self.db.query(MaterialOrderForecast)

        if target_month:
            query = query.filter(MaterialOrderForecast.target_month == target_month)
        if material_code:
            query = query.filter(MaterialOrderForecast.material_code.ilike(f"%{material_code}%"))
        if maker_code:
            query = query.filter(MaterialOrderForecast.maker_code == maker_code)
        if jiku_code:
            query = query.filter(MaterialOrderForecast.jiku_code == jiku_code)

        query = query.order_by(
            MaterialOrderForecast.target_month.desc(),
            MaterialOrderForecast.material_code,
        )

        return query.limit(limit).offset(offset).all()
