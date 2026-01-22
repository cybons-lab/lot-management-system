"""SAP突合サービス.

OCRデータとSAPキャッシュ・マスタを突合して、
ステータス（完全一致/前方一致/未一致）を判定する。

Phase 1: 手動トリガーで突合確認 + ログ出力
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.sap_models import SapMaterialCache
from app.infrastructure.persistence.models.shipping_master_models import (
    ShippingMasterCurated,
)


logger = logging.getLogger(__name__)


class SapMatchType(str, Enum):
    """SAP突合タイプ."""

    EXACT = "exact"  # 完全一致
    PREFIX = "prefix"  # 前方一致（警告）
    NOT_FOUND = "not_found"  # 未一致


class MasterMatchType(str, Enum):
    """マスタ突合タイプ."""

    MATCHED = "matched"  # 一致
    NOT_FOUND = "not_found"  # 未一致


class OverallStatus(str, Enum):
    """総合ステータス."""

    OK = "ok"  # SAP + マスタ両方一致
    WARNING = "warning"  # 前方一致（要確認）
    ERROR = "error"  # SAP or マスタ未一致


@dataclass
class ReconciliationResult:
    """1行の突合結果."""

    # 入力データ
    material_code: str | None
    jiku_code: str | None
    customer_code: str

    # SAP突合結果
    sap_match_type: SapMatchType
    # マスタ突合結果
    master_match_type: MasterMatchType

    # SAP突合詳細（デフォルト値あり）
    sap_matched_zkdmat_b: str | None = None
    sap_raw_data: dict[str, Any] | None = None

    # マスタ突合詳細
    master_id: int | None = None
    master_customer_part_no: str | None = None

    # 総合ステータス
    overall_status: OverallStatus = OverallStatus.ERROR

    # メッセージ
    messages: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換."""
        return {
            "material_code": self.material_code,
            "jiku_code": self.jiku_code,
            "customer_code": self.customer_code,
            "sap_match_type": self.sap_match_type.value,
            "sap_matched_zkdmat_b": self.sap_matched_zkdmat_b,
            "sap_raw_data": self.sap_raw_data,
            "master_match_type": self.master_match_type.value,
            "master_id": self.master_id,
            "master_customer_part_no": self.master_customer_part_no,
            "overall_status": self.overall_status.value,
            "messages": self.messages,
        }


@dataclass
class ReconciliationSummary:
    """突合サマリー."""

    total_count: int = 0
    ok_count: int = 0
    warning_count: int = 0
    error_count: int = 0

    sap_exact_count: int = 0
    sap_prefix_count: int = 0
    sap_not_found_count: int = 0

    master_matched_count: int = 0
    master_not_found_count: int = 0

    results: list[ReconciliationResult] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換."""
        return {
            "total_count": self.total_count,
            "ok_count": self.ok_count,
            "warning_count": self.warning_count,
            "error_count": self.error_count,
            "sap_exact_count": self.sap_exact_count,
            "sap_prefix_count": self.sap_prefix_count,
            "sap_not_found_count": self.sap_not_found_count,
            "master_matched_count": self.master_matched_count,
            "master_not_found_count": self.master_not_found_count,
            "results": [r.to_dict() for r in self.results],
        }


class SapReconciliationService:
    """SAP突合サービス.

    突合ロジック:
    1. SAP突合
       - 完全一致: material_code == ZKDMAT_B
       - 前方一致: material_codeでZKDMAT_Bが前方一致 & 一意に絞れる
    2. マスタ突合
       - キー: (customer_code, material_code, jiku_code)
    3. 総合判定
       - OK: SAP完全一致 & マスタ一致
       - WARNING: SAP前方一致 & マスタ一致
       - ERROR: SAP未一致 or マスタ未一致
    """

    def __init__(self, db: Session):
        """初期化.

        Args:
            db: データベースセッション
        """
        self.db = db
        self._sap_cache: dict[str, SapMaterialCache] | None = None
        self._sap_cache_kunnr: str | None = None

    def load_sap_cache(
        self,
        kunnr: str,
        connection_id: int | None = None,
    ) -> int:
        """SAPキャッシュをメモリにロード.

        Args:
            kunnr: 得意先コード
            connection_id: 接続ID（Noneなら全接続）

        Returns:
            ロードした件数
        """
        stmt = select(SapMaterialCache).where(SapMaterialCache.kunnr == kunnr)

        if connection_id:
            stmt = stmt.where(SapMaterialCache.connection_id == connection_id)

        cache_list = list(self.db.execute(stmt).scalars().all())
        self._sap_cache = {item.zkdmat_b: item for item in cache_list}
        self._sap_cache_kunnr = kunnr

        logger.info(
            f"[SapReconciliationService] Loaded {len(self._sap_cache)} "
            f"SAP cache entries for kunnr={kunnr}"
        )
        return len(self._sap_cache)

    def reconcile_single(
        self,
        material_code: str | None,
        jiku_code: str | None,
        customer_code: str = "100427105",
    ) -> ReconciliationResult:
        """1行を突合.

        Args:
            material_code: 材質コード
            jiku_code: 次区
            customer_code: 得意先コード

        Returns:
            突合結果
        """
        result = ReconciliationResult(
            material_code=material_code,
            jiku_code=jiku_code,
            customer_code=customer_code,
            sap_match_type=SapMatchType.NOT_FOUND,
            master_match_type=MasterMatchType.NOT_FOUND,
            overall_status=OverallStatus.ERROR,
        )

        # 材質コードが空の場合
        if not material_code or not material_code.strip():
            result.messages.append("材質コードが空です")
            return result

        material_code = material_code.strip()

        # SAP突合
        self._reconcile_sap(result, material_code)

        # マスタ突合
        self._reconcile_master(result, material_code, jiku_code, customer_code)

        # 総合判定
        self._determine_overall_status(result)

        return result

    def _reconcile_sap(
        self,
        result: ReconciliationResult,
        material_code: str,
    ) -> None:
        """SAP突合.

        Args:
            result: 突合結果（更新される）
            material_code: 材質コード
        """
        if self._sap_cache is None:
            result.messages.append("SAPキャッシュが未ロードです")
            return

        # 1. 完全一致チェック
        if material_code in self._sap_cache:
            cache_item = self._sap_cache[material_code]
            result.sap_match_type = SapMatchType.EXACT
            result.sap_matched_zkdmat_b = cache_item.zkdmat_b
            result.sap_raw_data = cache_item.raw_data
            logger.debug(f"[SAP] Exact match: {material_code} == {cache_item.zkdmat_b}")
            return

        # 2. 前方一致チェック
        prefix_matches = [
            item for zkdmat_b, item in self._sap_cache.items() if zkdmat_b.startswith(material_code)
        ]

        if len(prefix_matches) == 1:
            # 一意に絞れた場合のみ採用
            cache_item = prefix_matches[0]
            result.sap_match_type = SapMatchType.PREFIX
            result.sap_matched_zkdmat_b = cache_item.zkdmat_b
            result.sap_raw_data = cache_item.raw_data
            result.messages.append(f"前方一致: {material_code} → {cache_item.zkdmat_b}")
            logger.debug(f"[SAP] Prefix match: {material_code} → {cache_item.zkdmat_b}")
            return

        if len(prefix_matches) > 1:
            # 複数マッチは採用しない
            matched_codes = [m.zkdmat_b for m in prefix_matches[:5]]
            result.messages.append(f"前方一致で複数ヒット（採用不可）: {matched_codes}")
            logger.debug(f"[SAP] Multiple prefix matches for {material_code}: {matched_codes}")

        # 未一致
        result.sap_match_type = SapMatchType.NOT_FOUND
        result.messages.append(f"SAP未一致: {material_code}")

    def _reconcile_master(
        self,
        result: ReconciliationResult,
        material_code: str,
        jiku_code: str | None,
        customer_code: str,
    ) -> None:
        """マスタ突合.

        Args:
            result: 突合結果（更新される）
            material_code: 材質コード
            jiku_code: 次区
            customer_code: 得意先コード
        """
        if not jiku_code or not jiku_code.strip():
            result.messages.append("次区が空です（マスタ突合スキップ）")
            return

        jiku_code = jiku_code.strip()

        stmt = select(ShippingMasterCurated).where(
            ShippingMasterCurated.customer_code == customer_code,
            ShippingMasterCurated.material_code == material_code,
            ShippingMasterCurated.jiku_code == jiku_code,
        )

        master = self.db.execute(stmt).scalar_one_or_none()

        if master:
            result.master_match_type = MasterMatchType.MATCHED
            result.master_id = master.id
            result.master_customer_part_no = master.customer_part_no
            logger.debug(
                f"[Master] Matched: ({customer_code}, {material_code}, {jiku_code}) "
                f"→ id={master.id}, customer_part_no={master.customer_part_no}"
            )
        else:
            result.master_match_type = MasterMatchType.NOT_FOUND
            result.messages.append(f"マスタ未一致: ({customer_code}, {material_code}, {jiku_code})")

    def _determine_overall_status(self, result: ReconciliationResult) -> None:
        """総合ステータスを判定.

        Args:
            result: 突合結果（更新される）
        """
        sap_ok = result.sap_match_type in (SapMatchType.EXACT, SapMatchType.PREFIX)
        master_ok = result.master_match_type == MasterMatchType.MATCHED

        if sap_ok and master_ok:
            if result.sap_match_type == SapMatchType.EXACT:
                result.overall_status = OverallStatus.OK
            else:
                result.overall_status = OverallStatus.WARNING
        else:
            result.overall_status = OverallStatus.ERROR

    def reconcile_batch(
        self,
        items: list[dict[str, Any]],
        customer_code: str = "100427105",
        material_code_key: str = "material_code",
        jiku_code_key: str = "jiku_code",
    ) -> ReconciliationSummary:
        """バッチ突合.

        Args:
            items: 突合対象のリスト（dictのリスト）
            customer_code: 得意先コード
            material_code_key: 材質コードのキー名
            jiku_code_key: 次区のキー名

        Returns:
            突合サマリー
        """
        # SAPキャッシュをロード
        if self._sap_cache is None or self._sap_cache_kunnr != customer_code:
            self.load_sap_cache(customer_code)

        summary = ReconciliationSummary()

        for item in items:
            material_code = item.get(material_code_key)
            jiku_code = item.get(jiku_code_key)

            result = self.reconcile_single(material_code, jiku_code, customer_code)
            summary.results.append(result)
            summary.total_count += 1

            # カウント集計
            if result.overall_status == OverallStatus.OK:
                summary.ok_count += 1
            elif result.overall_status == OverallStatus.WARNING:
                summary.warning_count += 1
            else:
                summary.error_count += 1

            if result.sap_match_type == SapMatchType.EXACT:
                summary.sap_exact_count += 1
            elif result.sap_match_type == SapMatchType.PREFIX:
                summary.sap_prefix_count += 1
            else:
                summary.sap_not_found_count += 1

            if result.master_match_type == MasterMatchType.MATCHED:
                summary.master_matched_count += 1
            else:
                summary.master_not_found_count += 1

        logger.info(
            f"[SapReconciliationService] Batch reconciliation completed: "
            f"total={summary.total_count}, ok={summary.ok_count}, "
            f"warning={summary.warning_count}, error={summary.error_count}"
        )

        return summary

    def reconcile_ocr_results(
        self,
        task_date: str | None = None,
        config_id: int | None = None,
        customer_code: str = "100427105",
    ) -> ReconciliationSummary:
        """OCR結果を突合.

        Args:
            task_date: タスク日付（YYYY-MM-DD）
            config_id: SmartRead設定ID
            customer_code: 得意先コード

        Returns:
            突合サマリー
        """
        from sqlalchemy import text

        # SAPキャッシュをロード（なければ再取得を試みる）
        cache_count = self.load_sap_cache(customer_code)

        if cache_count == 0:
            logger.warning(
                "[SapReconciliationService] SAP cache is empty, attempting to fetch from SAP..."
            )
            # キャッシュがなければSAPから再取得を試みる
            from app.application.services.sap.sap_material_service import (
                SapMaterialService,
            )

            material_service = SapMaterialService(self.db)
            fetch_result = material_service.fetch_and_cache_materials(kunnr_f=customer_code)

            if fetch_result.success:
                cache_count = self.load_sap_cache(customer_code)
                logger.info(
                    f"[SapReconciliationService] Fetched and loaded {cache_count} SAP cache entries"
                )
            else:
                logger.error(
                    f"[SapReconciliationService] Failed to fetch SAP data: "
                    f"{fetch_result.error_message}"
                )

        # OCR結果を取得（v_ocr_resultsビューから）
        sql = """
            SELECT
                id,
                material_code,
                jiku_code,
                customer_code
            FROM v_ocr_results
            WHERE 1=1
        """
        params: dict[str, Any] = {}

        if task_date:
            sql += " AND task_date = :task_date"
            params["task_date"] = task_date

        if config_id:
            sql += " AND config_id = :config_id"
            params["config_id"] = config_id

        sql += " ORDER BY id"

        rows = self.db.execute(text(sql), params).fetchall()

        # バッチ突合
        items = [
            {
                "id": row.id,
                "material_code": row.material_code,
                "jiku_code": row.jiku_code,
            }
            for row in rows
        ]

        summary = self.reconcile_batch(
            items,
            customer_code=customer_code,
            material_code_key="material_code",
            jiku_code_key="jiku_code",
        )

        return summary
