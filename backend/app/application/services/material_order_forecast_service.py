"""Material Order Forecast Service.

材料発注フォーキャストのCSVインポート・取得サービス。
"""

import json
import logging
from collections.abc import Sequence
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from typing import BinaryIO

import pandas as pd
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    CustomerItem,
    DeliveryPlace,
    Maker,
    MaterialOrderForecast,
    SupplierItem,
    VMaterialOrderForecast,
    Warehouse,
)


logger = logging.getLogger(__name__)

# 生CSV（materialOrderOriginal）→ 取込フォーマット60列への列マッピング
# None は空列を意味する（次区/メーカー名の補完用）
RAW_COL_INDEX_SPEC: list[int | None] = (
    [1, 8, 9, 11, 12, None]
    + list(range(13, 16))
    + [None]
    + list(range(16, 20))
    + [22, 24, 56]
    + list(range(25, 56))
    + list(range(57, 69))
)


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
        """CSVファイルをインポートして material_order_forecasts に保存."""
        logger.info("Starting CSV import", extra={"source_file": filename, "user_id": user_id})

        try:
            # Step 1: CSV読み込み（ヘッダーなし）
            df, detected_encoding = self._read_csv_with_encoding_fallback(file)

            if df.empty:
                raise ValueError("CSVファイルが空です")

            # 生CSV/旧フォーマットを正規化して、以降は60列前提で処理する
            df, normalize_warnings = self._normalize_input_columns(df)

            logger.info(
                f"CSV loaded: {len(df)} rows, {len(df.columns)} columns (encoding={detected_encoding})"
            )

            if len(df.columns) < 60:
                raise ValueError(
                    f"CSV列数が不足しています（期待: 60列以上、実際: {len(df.columns)}列）"
                )

            # Step 2: 対象月を決定（YYYYMM → YYYY-MM）
            if not target_month:
                target_month_raw = str(df.iloc[0, 0])
                if len(target_month_raw) == 6 and target_month_raw.isdigit():
                    target_month = f"{target_month_raw[:4]}-{target_month_raw[4:6]}"
                else:
                    raise ValueError(
                        f"対象月の形式が不正です（期待: YYYYMM、実際: {target_month_raw}）"
                    )

            logger.info(f"Target month: {target_month}")

            # Step 2.4: 参照マスタの未解決を警告化（保存値の補完はしない）
            master_reference_warnings = self._build_master_reference_warnings(df)

            # Step 2.5: 次区コード空行は警告のみ（ビュー参照で解決できるため）
            jiku_series = df.iloc[:, 4].fillna("").astype(str).str.strip()
            missing_jiku = jiku_series == ""
            if missing_jiku.any():
                row_indices = df.index[missing_jiku].tolist()
                row_numbers = [int(idx) + 1 for idx in row_indices]
                sample_rows = ", ".join(str(num) for num in row_numbers[:5])
                normalize_warnings.append(f"次区コードが空の行があります（行: {sample_rows}）")

            # Step 3: 数量列を数値化（L-Q列のうちO列は除外 + R-AX列）
            qty_col_indices = [11, 12, 13, 15, 16] + list(range(17, 60))
            for col_idx in qty_col_indices:
                if col_idx < len(df.columns):
                    col_name = df.columns[col_idx]
                    df[col_name] = pd.to_numeric(df[col_name], errors="coerce")

            # Step 4: 日別・期間別数量をJSON化
            df = self._create_quantity_json(df)

            # Step 5: 既存マスタ引当（FKのみ）
            df, warnings = self._enrich_with_masters(df)
            warnings = [*normalize_warnings, *master_reference_warnings, *warnings]

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

    @staticmethod
    def _read_csv_with_encoding_fallback(file: BinaryIO) -> tuple[pd.DataFrame, str]:
        """CSVを複数エンコーディングで読み込み（UTF-8/Shift_JIS系に対応）."""
        raw_bytes = file.read()
        if not raw_bytes:
            raise ValueError("CSVファイルが空です")

        candidate_encodings = ["utf-8-sig", "utf-8", "cp932", "shift_jis"]
        last_error: Exception | None = None

        for encoding in candidate_encodings:
            try:
                df = pd.read_csv(
                    BytesIO(raw_bytes),
                    header=None,
                    dtype=str,
                    keep_default_na=False,
                    encoding=encoding,
                )
                return df, encoding
            except UnicodeDecodeError as e:
                last_error = e
                continue

        if last_error is not None:
            raise ValueError(
                "CSVの文字コードを判定できませんでした。UTF-8 または Shift_JIS（CP932）で保存してください。"
            ) from last_error

        raise ValueError("CSV読み込みに失敗しました")

    @staticmethod
    def _normalize_input_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
        """入力CSV列を正規化して60列フォーマットに揃える."""
        warnings: list[str] = []
        col_count = len(df.columns)
        if col_count == 60:
            return df, warnings

        # 旧フォーマット: 次区(E列)とメーカー名(J列)が欠落した58列
        if col_count == 58:
            normalized = df.copy()
            normalized.insert(4, "__jiku_placeholder__", "")
            normalized.insert(9, "__maker_name_placeholder__", "")
            warnings.append("58列CSVを検出したため、次区とメーカー名の列を補完して処理しました。")
            return normalized, warnings

        # 生CSV（materialOrderOriginal）: 列再配置で60列に変換
        if col_count >= 69:
            transformed = MaterialOrderForecastService._transform_raw_csv_to_import_format(df)
            if transformed is not None:
                warnings.append("生CSV形式を検出し、取込フォーマットへ自動変換しました。")
                return transformed, warnings

        # 余剰列がある場合は先頭60列のみ採用
        if col_count > 60:
            warnings.append(
                f"60列超のCSVを検出したため、先頭60列のみを取込対象として処理しました（実際: {col_count}列）。"
            )
            return df.iloc[:, :60].copy(), warnings

        return df, warnings

    @staticmethod
    def _transform_raw_csv_to_import_format(df: pd.DataFrame) -> pd.DataFrame | None:
        """生CSVを列マッピング仕様で60列取込フォーマットに変換."""
        spec: Sequence[int | None] = RAW_COL_INDEX_SPEC
        if len(spec) != 60:
            return None

        non_null_idx = [i for i in spec if i is not None]
        if not non_null_idx:
            return None

        needed = max(non_null_idx) + 1
        if len(df.columns) < needed:
            return None

        selected = df.iloc[:, non_null_idx]
        cols = []
        take_ptr = 0
        for idx in spec:
            if idx is None:
                cols.append(pd.Series("", index=df.index))
            else:
                cols.append(selected.iloc[:, take_ptr])
                take_ptr += 1

        out = pd.concat(cols, axis=1)
        out.columns = list(range(60))
        return out

    def _build_master_reference_warnings(self, df: pd.DataFrame) -> list[str]:
        """次区/メーカー名の参照可否を警告として返す（データ補完はしない）."""
        warnings: list[str] = []

        delivery_to_jiku = {
            (dp.delivery_place_code or "").strip(): dp.jiku_code
            for dp in self.db.query(DeliveryPlace).filter(DeliveryPlace.valid_to >= date.today())
            if (dp.delivery_place_code or "").strip()
        }
        jiku_col = df.iloc[:, 4].fillna("").astype(str).str.strip()
        delivery_col = df.iloc[:, 5].fillna("").astype(str).str.strip()
        unresolved_jiku = (
            (jiku_col == "") & (delivery_col != "") & (~delivery_col.isin(delivery_to_jiku))
        )
        if unresolved_jiku.any():
            sample = df.loc[unresolved_jiku, df.columns[5]].astype(str).unique()[:5]
            warnings.append(
                f"納入先コードから次区を解決できないデータがあります: {', '.join(sample)}"
            )

        maker_code_to_name = {
            (m.maker_code or "").strip(): (m.maker_name or "").strip()
            for m in self.db.query(Maker).filter(Maker.valid_to >= date.today())
            if (m.maker_code or "").strip() and (m.maker_name or "").strip()
        }
        for si in self.db.query(SupplierItem).all():
            code = (si.maker_code or "").strip()
            name = (si.maker_name or "").strip()
            if code and name and code not in maker_code_to_name:
                maker_code_to_name[code] = name

        maker_name_col = df.iloc[:, 9].fillna("").astype(str).str.strip()
        maker_code_col = df.iloc[:, 8].fillna("").astype(str).str.strip()
        unresolved_maker_name = (
            (maker_name_col == "")
            & (maker_code_col != "")
            & (~maker_code_col.isin(maker_code_to_name))
        )
        if unresolved_maker_name.any():
            sample = df.loc[unresolved_maker_name, df.columns[8]].astype(str).unique()[:5]
            warnings.append(
                f"メーカーコードからメーカー名を解決できないデータがあります: {', '.join(sample)}"
            )

        return warnings

    def _create_quantity_json(self, df: pd.DataFrame) -> pd.DataFrame:
        """日別・期間別数量をJSON化."""
        daily_quantities_list = []
        period_quantities_list = []

        for _, row in df.iterrows():
            daily = {}
            for day in range(1, 32):
                col_idx = 17 + day - 1
                if col_idx < len(row):
                    val = row.iloc[col_idx]
                    if pd.notna(val) and val != "":
                        try:
                            daily[str(day)] = float(val)
                        except (ValueError, TypeError):
                            pass
            daily_quantities_list.append(json.dumps(daily) if daily else None)

            period = {}
            period_labels = [str(i) for i in range(1, 11)] + ["中旬", "下旬"]
            for i, label in enumerate(period_labels):
                col_idx = 48 + i
                if col_idx < len(row):
                    val = row.iloc[col_idx]
                    if pd.notna(val) and val != "":
                        try:
                            period[label] = float(val)
                        except (ValueError, TypeError):
                            pass
            period_quantities_list.append(json.dumps(period) if period else None)

        df["daily_quantities_json"] = pd.Series(daily_quantities_list, dtype=object)
        df["period_quantities_json"] = pd.Series(period_quantities_list, dtype=object)
        return df

    def _enrich_with_masters(self, df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
        """既存マスタ引当（LEFT JOIN用）."""
        warnings = []

        customer_item_map = {
            ci.customer_part_no: ci.id
            for ci in self.db.query(CustomerItem).filter(CustomerItem.valid_to >= date.today())
        }
        df["customer_item_id"] = df.iloc[:, 1].map(customer_item_map)

        missing_material = df[df["customer_item_id"].isna()].iloc[:, 1].unique()
        if len(missing_material) > 0:
            warnings.append(
                f"得意先品番マスタに見つからないコード: {', '.join(str(x) for x in missing_material[:5])}"
            )

        maker_map = {
            m.maker_code: m.id for m in self.db.query(Maker).filter(Maker.valid_to >= date.today())
        }
        df["maker_id"] = df.iloc[:, 8].map(maker_map)

        missing_makers = df[df["maker_id"].isna()].iloc[:, 8].unique()
        if len(missing_makers) > 0:
            warnings.append(
                f"メーカーマスタに見つからないコード: {', '.join(str(x) for x in missing_makers[:5])}"
            )

        warehouse_map = {
            w.warehouse_code: w.id
            for w in self.db.query(Warehouse).filter(Warehouse.valid_to >= date.today())
        }
        df["warehouse_id"] = df.iloc[:, 3].map(warehouse_map)

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

        def clean_id(val):
            if pd.isna(val) or val == "":
                return None
            return int(val)

        for idx, row in df.iterrows():
            try:
                material_code = str(row.iloc[1]) if pd.notna(row.iloc[1]) else None
                jiku_code = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else ""
                maker_code = str(row.iloc[8]) if pd.notna(row.iloc[8]) else None

                self.db.query(MaterialOrderForecast).filter(
                    MaterialOrderForecast.target_month == target_month,
                    MaterialOrderForecast.material_code == material_code,
                    MaterialOrderForecast.jiku_code == jiku_code,
                    MaterialOrderForecast.maker_code == maker_code,
                ).delete()

                forecast = MaterialOrderForecast(
                    target_month=target_month,
                    customer_item_id=clean_id(row.get("customer_item_id")),
                    warehouse_id=clean_id(row.get("warehouse_id")),
                    maker_id=clean_id(row.get("maker_id")),
                    material_code=material_code,
                    unit=row.iloc[2] or None,
                    warehouse_code=row.iloc[3] or None,
                    jiku_code=jiku_code,
                    delivery_place=row.iloc[5] or None,
                    support_division=row.iloc[6] or None,
                    procurement_type=row.iloc[7] or None,
                    maker_code=maker_code,
                    maker_name=row.iloc[9] or None,
                    material_name=row.iloc[10] or None,
                    delivery_lot=self._to_decimal(row.iloc[11]),
                    order_quantity=self._to_decimal(row.iloc[12]),
                    month_start_instruction=self._to_decimal(row.iloc[13]),
                    manager_name=row.iloc[14] or None,
                    monthly_instruction_quantity=self._to_decimal(row.iloc[15]),
                    next_month_notice=self._to_decimal(row.iloc[16]),
                    daily_quantities=json.loads(row["daily_quantities_json"])
                    if row["daily_quantities_json"]
                    else None,
                    period_quantities=json.loads(row["period_quantities_json"])
                    if row["period_quantities_json"]
                    else None,
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
    ) -> Sequence[VMaterialOrderForecast | MaterialOrderForecast]:
        """フォーキャストデータをビュー経由で取得（マスタ補完を動的反映）."""
        try:
            query = self.db.query(VMaterialOrderForecast)

            if target_month:
                query = query.filter(VMaterialOrderForecast.target_month == target_month)
            if material_code:
                query = query.filter(
                    VMaterialOrderForecast.material_code.ilike(f"%{material_code}%")
                )
            if maker_code:
                query = query.filter(VMaterialOrderForecast.maker_code == maker_code)
            if jiku_code:
                query = query.filter(VMaterialOrderForecast.jiku_code == jiku_code)

            query = query.order_by(
                VMaterialOrderForecast.target_month.desc(),
                VMaterialOrderForecast.material_code,
            )
            return query.limit(limit).offset(offset).all()
        except Exception as e:
            logger.warning(
                "v_material_order_forecasts is unavailable. Falling back to base table query.",
                extra={"error": str(e)},
            )
            query = self.db.query(MaterialOrderForecast)
            if target_month:
                query = query.filter(MaterialOrderForecast.target_month == target_month)
            if material_code:
                query = query.filter(
                    MaterialOrderForecast.material_code.ilike(f"%{material_code}%")
                )
            if maker_code:
                query = query.filter(MaterialOrderForecast.maker_code == maker_code)
            if jiku_code:
                query = query.filter(MaterialOrderForecast.jiku_code == jiku_code)
            query = query.order_by(
                MaterialOrderForecast.target_month.desc(),
                MaterialOrderForecast.material_code,
            )
            return query.limit(limit).offset(offset).all()
