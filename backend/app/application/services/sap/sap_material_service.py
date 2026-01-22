"""SAPマテリアルダウンロードサービス.

Z_SCM1_RFC_MATERIAL_DOWNLOADを呼び出し、ET_DATAをキャッシュに保存する。

Phase 1: 手動トリガーでSAPからデータ取得 → DBキャッシュ保存
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.sap_models import (
    SapConnection,
    SapFetchLog,
    SapMaterialCache,
)


if TYPE_CHECKING:
    import pandas as pd

logger = logging.getLogger(__name__)

# RFC名（固定）
RFC_NAME = "Z_SCM1_RFC_MATERIAL_DOWNLOAD"

# SAPカラムマッピング（確定分）
SAP_COLS = {
    "customer_item": "ZKDMAT_B",  # 先方品番
}


class SapMaterialFetchResult:
    """SAP取得結果."""

    def __init__(
        self,
        *,
        success: bool,
        fetch_batch_id: str,
        record_count: int = 0,
        cached_count: int = 0,
        error_message: str | None = None,
        duration_ms: int = 0,
    ):
        self.success = success
        self.fetch_batch_id = fetch_batch_id
        self.record_count = record_count
        self.cached_count = cached_count
        self.error_message = error_message
        self.duration_ms = duration_ms

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換."""
        return {
            "success": self.success,
            "fetch_batch_id": self.fetch_batch_id,
            "record_count": self.record_count,
            "cached_count": self.cached_count,
            "error_message": self.error_message,
            "duration_ms": self.duration_ms,
        }


class SapMaterialService:
    """SAPマテリアルダウンロードサービス.

    Z_SCM1_RFC_MATERIAL_DOWNLOADを呼び出し、結果をキャッシュに保存する。
    """

    def __init__(self, db: Session):
        """初期化.

        Args:
            db: データベースセッション
        """
        self.db = db

    def get_default_connection(self) -> SapConnection | None:
        """デフォルトのSAP接続情報を取得.

        Returns:
            デフォルト接続、なければアクティブな最初の接続
        """
        # デフォルト接続を検索
        stmt = select(SapConnection).where(
            SapConnection.is_active == True,  # noqa: E712
            SapConnection.is_default == True,  # noqa: E712
        )
        conn = self.db.execute(stmt).scalar_one_or_none()

        if conn:
            return conn

        # デフォルトがなければアクティブな最初の接続
        stmt = (
            select(SapConnection)
            .where(
                SapConnection.is_active == True  # noqa: E712
            )
            .order_by(SapConnection.id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_connection_by_id(self, connection_id: int) -> SapConnection | None:
        """IDでSAP接続情報を取得.

        Args:
            connection_id: 接続ID

        Returns:
            接続情報
        """
        return self.db.get(SapConnection, connection_id)

    def fetch_and_cache_materials(
        self,
        connection_id: int | None = None,
        *,
        kunnr_f: str | None = None,
        kunnr_t: str | None = None,
        bukrs: str = "10",
        zaiko: str = "X",
        limit: int | None = None,
        decrypted_passwd: str | None = None,
    ) -> SapMaterialFetchResult:
        """SAPからマテリアルデータを取得してキャッシュに保存.

        Args:
            connection_id: 接続ID（Noneならデフォルト接続）
            kunnr_f: 得意先コードFrom
            kunnr_t: 得意先コードTo（Noneならkunnr_fと同じ）
            bukrs: 会社コード（デフォルト: 10）
            zaiko: 在庫品フラグ（デフォルト: X）
            limit: 取得件数上限
            decrypted_passwd: 復号化されたパスワード（Noneならモック動作）

        Returns:
            取得結果
        """
        fetch_batch_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # 接続情報取得
        if connection_id:
            connection = self.get_connection_by_id(connection_id)
        else:
            connection = self.get_default_connection()

        if not connection:
            return SapMaterialFetchResult(
                success=False,
                fetch_batch_id=fetch_batch_id,
                error_message="SAP接続情報が見つかりません",
            )

        # 得意先コードのデフォルト値
        if not kunnr_f:
            kunnr_f = connection.default_kunnr or "100427105"
        if not kunnr_t:
            kunnr_t = kunnr_f

        params: dict[str, Any] = {
            "I_ZAIKO": zaiko,
            "I_ZBUKRS": bukrs,
            "I_ZKUNNR_F": kunnr_f,
            "I_ZKUNNR_T": kunnr_t,
        }
        if limit is not None:
            params["I_MAX"] = int(limit)

        try:
            # RFC呼び出し（またはモック）
            if decrypted_passwd:
                df = self._call_rfc(connection, decrypted_passwd, params)
            else:
                logger.info("[SapMaterialService] No password provided, using mock data")
                df = self._generate_mock_data(kunnr_f)

            record_count = len(df) if df is not None else 0

            # キャッシュに保存
            cached_count = 0
            if df is not None and not df.empty:
                cached_count = self._save_to_cache(connection.id, df, kunnr_f, fetch_batch_id)

            duration_ms = int((time.time() - start_time) * 1000)

            # ログ記録
            self._log_fetch(
                connection_id=connection.id,
                fetch_batch_id=fetch_batch_id,
                params=params,
                status="SUCCESS",
                record_count=record_count,
                duration_ms=duration_ms,
            )

            logger.info(
                f"[SapMaterialService] Fetch completed: "
                f"batch={fetch_batch_id}, records={record_count}, "
                f"cached={cached_count}, duration={duration_ms}ms"
            )

            return SapMaterialFetchResult(
                success=True,
                fetch_batch_id=fetch_batch_id,
                record_count=record_count,
                cached_count=cached_count,
                duration_ms=duration_ms,
            )

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_message = str(e)

            # ログ記録
            self._log_fetch(
                connection_id=connection.id,
                fetch_batch_id=fetch_batch_id,
                params=params,
                status="ERROR",
                error_message=error_message,
                duration_ms=duration_ms,
            )

            logger.exception(f"[SapMaterialService] Fetch failed: batch={fetch_batch_id}")

            return SapMaterialFetchResult(
                success=False,
                fetch_batch_id=fetch_batch_id,
                error_message=error_message,
                duration_ms=duration_ms,
            )

    def _call_rfc(
        self,
        connection: SapConnection,
        decrypted_passwd: str,
        params: dict[str, Any],
    ) -> pd.DataFrame:
        """RFC呼び出し.

        Args:
            connection: 接続情報
            decrypted_passwd: 復号化されたパスワード
            params: 呼び出しパラメータ

        Returns:
            ET_DATAのDataFrame
        """
        import pandas as pd

        try:
            from pyrfc import Connection
        except ImportError as e:
            logger.warning(f"pyrfc not available: {e}")
            raise RuntimeError("pyrfc is not installed") from e

        conn_info = connection.to_conn_info(decrypted_passwd)

        logger.info(f"[SapMaterialService] Calling RFC: {RFC_NAME}")

        with Connection(**conn_info) as conn:
            result = conn.call(RFC_NAME, **params)
            et_data = result.get("ET_DATA", [])
            return pd.DataFrame(et_data)

    def _generate_mock_data(self, kunnr: str) -> pd.DataFrame:
        """モックデータ生成.

        Args:
            kunnr: 得意先コード

        Returns:
            モックのET_DATA DataFrame
        """
        import pandas as pd

        # 画像から読み取ったサンプルデータをベースにしたモック
        mock_data = [
            {"ZKDMAT_B": "8891200-FD", "ZKUNNR": kunnr, "ZMATNR": "Z250DSGY"},
            {"ZKDMAT_B": "8891548", "ZKUNNR": kunnr, "ZMATNR": "FZ-1240AKD"},
            {"ZKDMAT_B": "8891549", "ZKUNNR": kunnr, "ZMATNR": "FZ-1140B2"},
            {"ZKDMAT_B": "8890932", "ZKUNNR": kunnr, "ZMATNR": "FZ-3065-N GY"},
            {"ZKDMAT_B": "8891075", "ZKUNNR": kunnr, "ZMATNR": "Z-250-DS BK"},
            {"ZKDMAT_B": "8891195", "ZKUNNR": kunnr, "ZMATNR": "Z-230 BK-2B"},
            {"ZKDMAT_B": "8891250", "ZKUNNR": kunnr, "ZMATNR": "DIC PPS Z-250-L1 BLAC"},
            {"ZKDMAT_B": "8890774-DN", "ZKUNNR": kunnr, "ZMATNR": "FZ1240D"},
            {"ZKDMAT_B": "8890838", "ZKUNNR": kunnr, "ZMATNR": "FZ-3003-N BK"},
            {"ZKDMAT_B": "8890863-DN", "ZKUNNR": kunnr, "ZMATNR": "FZ3003NR"},
        ]

        logger.info(f"[SapMaterialService] Generated {len(mock_data)} mock records")
        return pd.DataFrame(mock_data)

    def _save_to_cache(
        self,
        connection_id: int,
        df: pd.DataFrame,
        kunnr: str,
        fetch_batch_id: str,
    ) -> int:
        """キャッシュに保存.

        Args:
            connection_id: 接続ID
            df: ET_DATA DataFrame
            kunnr: 得意先コード
            fetch_batch_id: 取得バッチID

        Returns:
            保存件数
        """
        if df.empty:
            return 0

        zkdmat_b_col = SAP_COLS["customer_item"]

        # ZKDMAT_B列が存在しない場合
        if zkdmat_b_col not in df.columns:
            logger.warning(f"[SapMaterialService] Column {zkdmat_b_col} not found in DataFrame")
            return 0

        now = datetime.now(UTC)
        cached_count = 0

        for _, row in df.iterrows():
            zkdmat_b = str(row.get(zkdmat_b_col, "")).strip()
            if not zkdmat_b:
                continue

            # ZKDMAT_B以外の列をraw_dataに格納
            raw_data = {
                k: v for k, v in row.to_dict().items() if k != zkdmat_b_col and v is not None
            }

            # Upsert（PostgreSQL INSERT ON CONFLICT）
            stmt = insert(SapMaterialCache).values(
                connection_id=connection_id,
                zkdmat_b=zkdmat_b,
                kunnr=kunnr,
                raw_data=raw_data,
                fetched_at=now,
                fetch_batch_id=fetch_batch_id,
                created_at=now,
                updated_at=now,
            )

            stmt = stmt.on_conflict_do_update(
                constraint="uq_sap_material_cache_key",
                set_={
                    "raw_data": stmt.excluded.raw_data,
                    "fetched_at": stmt.excluded.fetched_at,
                    "fetch_batch_id": stmt.excluded.fetch_batch_id,
                    "updated_at": stmt.excluded.updated_at,
                },
            )

            self.db.execute(stmt)
            cached_count += 1

        self.db.commit()
        return cached_count

    def _log_fetch(
        self,
        *,
        connection_id: int,
        fetch_batch_id: str,
        params: dict[str, Any],
        status: str,
        record_count: int = 0,
        error_message: str | None = None,
        duration_ms: int = 0,
    ) -> None:
        """取得ログを記録.

        Args:
            connection_id: 接続ID
            fetch_batch_id: 取得バッチID
            params: 呼び出しパラメータ
            status: SUCCESS/ERROR
            record_count: 取得件数
            error_message: エラーメッセージ
            duration_ms: 処理時間
        """
        log_entry = SapFetchLog(
            connection_id=connection_id,
            fetch_batch_id=fetch_batch_id,
            rfc_name=RFC_NAME,
            params=params,
            status=status,
            record_count=record_count if status == "SUCCESS" else None,
            error_message=error_message,
            duration_ms=duration_ms,
        )
        self.db.add(log_entry)
        self.db.commit()

    def get_cached_materials(
        self,
        connection_id: int | None = None,
        kunnr: str | None = None,
    ) -> list[SapMaterialCache]:
        """キャッシュからマテリアルデータを取得.

        Args:
            connection_id: 接続ID（Noneなら全接続）
            kunnr: 得意先コード（Noneなら全得意先）

        Returns:
            キャッシュデータリスト
        """
        stmt = select(SapMaterialCache)

        if connection_id:
            stmt = stmt.where(SapMaterialCache.connection_id == connection_id)
        if kunnr:
            stmt = stmt.where(SapMaterialCache.kunnr == kunnr)

        stmt = stmt.order_by(SapMaterialCache.zkdmat_b)
        return list(self.db.execute(stmt).scalars().all())

    def get_cache_as_dict(
        self,
        connection_id: int | None = None,
        kunnr: str | None = None,
    ) -> dict[str, SapMaterialCache]:
        """キャッシュを先方品番→キャッシュレコードの辞書で取得.

        Args:
            connection_id: 接続ID
            kunnr: 得意先コード

        Returns:
            先方品番をキーとした辞書
        """
        cache_list = self.get_cached_materials(connection_id, kunnr)
        return {item.zkdmat_b: item for item in cache_list}

    def clear_cache(
        self,
        connection_id: int | None = None,
        kunnr: str | None = None,
    ) -> int:
        """キャッシュをクリア.

        Args:
            connection_id: 接続ID（Noneなら全接続）
            kunnr: 得意先コード（Noneなら全得意先）

        Returns:
            削除件数
        """
        from sqlalchemy import delete

        stmt = delete(SapMaterialCache)

        if connection_id:
            stmt = stmt.where(SapMaterialCache.connection_id == connection_id)
        if kunnr:
            stmt = stmt.where(SapMaterialCache.kunnr == kunnr)

        result = self.db.execute(stmt)
        self.db.commit()
        # SQLAlchemy 2.0 の Result オブジェクトから rowcount を取得（DMLの場合）
        return getattr(result, "rowcount", 0) or 0
