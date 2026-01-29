from typing import Any

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.masters_models import CustomerItem
from app.infrastructure.persistence.models.rpa_models import (
    RpaRun,
    RpaRunEvent,
    RpaRunFetch,
    RpaRunGroup,
    RpaRunItem,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.infrastructure.persistence.models.views_models import VLotDetails


class RpaRepository:
    """RPA関連のデータアクセスを責務とするRepository.

    【設計意図】RPAリポジトリの設計判断:

    1. なぜRPA専用のリポジトリを作るのか
       理由: RPAワークフロー特化のデータアクセス層
       背景:
       - RPAサービス: Power Automate Desktop（PAD）の実行管理
       - RpaRun: 実行単位（1回のOCR処理、1回のSAP登録等）
       - RpaRunItem: 処理明細（受注1件ごとの処理状態）
       設計:
       - 汎用リポジトリとは分離し、RPA特有の操作に特化
       メリット:
       - RPAワークフロー変更時の影響範囲を限定

    2. get_runs() の設計（L32-42）
       理由: RPAタイプ別の実行履歴取得
       RPAタイプ:
       - "ocr_intake": OCR取り込み
       - "sap_registration": SAP登録
       - "inventory_check": 在庫確認
       用途:
       - フロントエンド: 実行履歴一覧を表示
       - 最新順（created_at DESC）でソート
       ページネーション:
       - skip, limit でページング対応

    3. get_unprocessed_items_count() の設計（L58-72）
       理由: Step3未完了アイテム数の集計
       業務フロー:
       - Step1: OCRでデータ抽出
       - Step2: バリデーション・発行フラグ設定
       - Step3: SAP登録実行
       カウント条件:
       - issue_flag=True: 発行対象（バリデーション合格）
       - result_status IN (None, 'pending', 'processing'): 未処理
       用途:
       - 「残り10件の処理が未完了」と表示
       - Step3の完了判定（count=0 → 全て完了）

    4. lock_issue_items() の設計（L74-83）
       理由: Step2開始時の楽観的ロック
       実装:
       - issue_flag=True のアイテムに対して lock_flag=True を一括更新
       - synchronize_session=False: セッション同期を無効化（バルク更新）
       業務的意義:
       - Step2実行中に、他プロセスが同じアイテムを処理しないよう保護
       戻り値:
       - 更新件数（ロックしたアイテム数）

    5. find_customer_item() の設計（L87-98）
       理由: OCR取り込み時のマスタ検索
       業務フロー:
       - OCRで「得意先コード: C001, 外部品番: EXT-123」を抽出
       → CustomerItem マスタで検索
       → 内部品番（maker_part_code）を取得
       複合キー検索:
       - customer_id + customer_part_no
       用途:
       - 得意先固有の品番を社内品番に変換

    6. find_product_by_maker_part_code() の設計（L100-102）
       理由: メーカー品番での製品検索
       用途:
       - OCR取り込み時の製品特定
       - SAP登録時の製品マスタ参照
       検索キー:
       - maker_part_code（メーカー品番）

    7. find_active_lots() の設計（L104-122）
       理由: RPAオーケストレーター用のロット検索
       業務背景:
       - SAP登録時: 在庫が存在するかを確認
       → active で current_quantity > 0 のロットのみ対象
       フィルタ条件:
       - product_group_id: 必須（製品指定）
       - supplier_id: オプション（仕入先指定）
       ソート順:
       - FEFO順（有効期限が近い順）
       → expiry_date ASC NULLS LAST, received_date ASC

    8. なぜ add() と refresh() があるのか（L20-26）
       理由: 汎用的なエンティティ操作
       add():
       - db.add(entity) のラッパー
       → リポジトリ経由で統一的に操作
       refresh():
       - db.refresh(entity) のラッパー
       → DB反映後の最新状態を取得
       用途:
       - サービス層で「エンティティ追加 → 即座に最新状態取得」

    9. なぜ synchronize_session=False なのか（L82）
       理由: バルク更新のパフォーマンス最適化
       背景:
       - 通常のupdate: SQLAlchemy がセッション内のオブジェクトを同期
       → 更新対象が多いとオーバーヘッド
       - synchronize_session=False: 同期をスキップ
       → バルク更新が高速化
       注意:
       - 更新後にオブジェクトをrefresh()する必要がある

    10. なぜマスタ検索メソッドがあるのか（L85-122）
        理由: RPAオーケストレーター内でのマスタ参照
        業務的背景:
        - RPAサービスは外部システム（PAD）とのやり取りが主体
        → OCRデータのバリデーション時にマスタ情報が必要
        設計:
        - リポジトリに検索メソッドを集約
        → サービス層がシンプルに保たれる
        トレードオフ:
        - リポジトリの責務が広がる
        → ただし、RPAワークフロー特有の操作として許容
    """

    def __init__(self, db: Session):
        self.db = db

    def add(self, entity: Any) -> None:
        """エンティティを追加."""
        self.db.add(entity)

    def refresh(self, entity: Any) -> None:
        """エンティティをリフレッシュ."""
        self.db.refresh(entity)

    def get_run(self, run_id: int) -> RpaRun | None:
        """Runを取得."""
        return self.db.query(RpaRun).filter(RpaRun.id == run_id).first()

    def get_runs(
        self,
        rpa_type: str,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[RpaRun], int]:
        """Run一覧を取得."""
        query = self.db.query(RpaRun).filter(RpaRun.rpa_type == rpa_type)
        total = query.count()
        runs = query.order_by(RpaRun.created_at.desc()).offset(skip).limit(limit).all()
        return runs, total

    def create_run_group(
        self,
        grouping_method: str,
        max_items_per_run: int | None,
        planned_run_count: int | None,
        rpa_type: str = "material_delivery_note",
        created_by_user_id: int | None = None,
    ) -> RpaRunGroup:
        """Runグループを作成."""
        group = RpaRunGroup(
            rpa_type=rpa_type,
            grouping_method=grouping_method,
            max_items_per_run=max_items_per_run,
            planned_run_count=planned_run_count,
            created_by_user_id=created_by_user_id,
        )
        self.db.add(group)
        self.db.flush()
        self.db.refresh(group)
        return group

    def add_run_event(
        self,
        run_id: int,
        event_type: str,
        message: str | None = None,
        created_by_user_id: int | None = None,
    ) -> RpaRunEvent:
        """Runイベントを追加."""
        event = RpaRunEvent(
            run_id=run_id,
            event_type=event_type,
            message=message,
            created_by_user_id=created_by_user_id,
        )
        self.db.add(event)
        self.db.flush()
        self.db.refresh(event)
        return event

    def get_run_events(self, run_id: int, limit: int = 100) -> list[RpaRunEvent]:
        """Runイベントを取得."""
        return (
            self.db.query(RpaRunEvent)
            .filter(RpaRunEvent.run_id == run_id)
            .order_by(RpaRunEvent.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_failed_items(self, run_id: int) -> list[RpaRunItem]:
        """失敗アイテム一覧を取得."""
        return (
            self.db.query(RpaRunItem)
            .filter(
                RpaRunItem.run_id == run_id,
                RpaRunItem.issue_flag.is_(True),
                or_(
                    RpaRunItem.result_status == "failure",
                    RpaRunItem.last_error_code.is_not(None),
                ),
            )
            .order_by(RpaRunItem.row_no.asc())
            .all()
        )

    def add_run_fetch(
        self,
        start_date,
        end_date,
        status: str,
        item_count: int | None,
        run_created: int | None,
        run_updated: int | None,
        message: str | None,
        rpa_type: str = "material_delivery_note",
    ) -> RpaRunFetch:
        """Step1の取得結果を保存."""
        fetch = RpaRunFetch(
            rpa_type=rpa_type,
            start_date=start_date,
            end_date=end_date,
            status=status,
            item_count=item_count,
            run_created=run_created,
            run_updated=run_updated,
            message=message,
        )
        self.db.add(fetch)
        self.db.flush()
        self.db.refresh(fetch)
        return fetch

    def get_latest_run_fetch(self, rpa_type: str = "material_delivery_note") -> RpaRunFetch | None:
        """最新の取得結果を取得."""
        return (
            self.db.query(RpaRunFetch)
            .filter(RpaRunFetch.rpa_type == rpa_type)
            .order_by(RpaRunFetch.created_at.desc())
            .first()
        )

    def get_item(self, run_id: int, item_id: int) -> RpaRunItem | None:
        """Itemを取得."""
        return (
            self.db.query(RpaRunItem)
            .filter(RpaRunItem.id == item_id, RpaRunItem.run_id == run_id)
            .first()
        )

    def get_items_by_ids(self, run_id: int, item_ids: list[int]):
        """指定したIDのItemリストを取得（Update用クエリビルダとして利用も可）."""
        return self.db.query(RpaRunItem).filter(
            RpaRunItem.run_id == run_id, RpaRunItem.id.in_(item_ids)
        )

    def get_unprocessed_items_count(self, run_id: int) -> int:
        """Step3未完了アイテム数を取得."""
        return (
            self.db.query(RpaRunItem)
            .filter(
                RpaRunItem.run_id == run_id,
                RpaRunItem.issue_flag.is_(True),
                or_(
                    RpaRunItem.result_status.is_(None),
                    RpaRunItem.result_status == "pending",
                    RpaRunItem.result_status == "processing",
                ),
            )
            .count()
        )

    def get_next_processing_item(self, run_id: int) -> RpaRunItem | None:
        """次に処理すべき未完了アイテムを取得."""
        return (
            self.db.query(RpaRunItem)
            .filter(
                RpaRunItem.run_id == run_id,
                RpaRunItem.issue_flag.is_(True),
                or_(
                    RpaRunItem.result_status.is_(None),
                    RpaRunItem.result_status == "pending",
                ),
            )
            .order_by(RpaRunItem.row_no.asc())
            .first()
        )

    def release_expired_item_locks(self, run_id: int, now: Any) -> int:
        """期限切れのロックを解除して再処理可能にする."""
        return (
            self.db.query(RpaRunItem)
            .filter(
                RpaRunItem.run_id == run_id,
                RpaRunItem.locked_until.is_not(None),
                RpaRunItem.locked_until <= now,
                RpaRunItem.result_status == "processing",
            )
            .update(
                {
                    "locked_until": None,
                    "locked_by": None,
                    "result_status": "pending",
                    "processing_started_at": None,
                    "last_error_code": "LOCK_TIMEOUT",
                    "last_error_message": "Lock expired; task returned to pending.",
                    "updated_at": now,
                },
                synchronize_session=False,
            )
        )

    def claim_next_processing_item(
        self,
        run_id: int,
        now: Any,
        lock_until: Any,
        include_failed: bool,
        lock_owner: str | None,
    ) -> RpaRunItem | None:
        """次に処理すべきアイテムをロックして取得する."""
        allowed_statuses = ["pending"]
        if include_failed:
            allowed_statuses.append("failure")

        query = self.db.query(RpaRunItem).filter(
            RpaRunItem.run_id == run_id,
            RpaRunItem.issue_flag.is_(True),
            or_(
                RpaRunItem.result_status.is_(None),
                RpaRunItem.result_status.in_(allowed_statuses),
            ),
            or_(RpaRunItem.locked_until.is_(None), RpaRunItem.locked_until <= now),
        )

        item = query.order_by(RpaRunItem.row_no.asc()).with_for_update(skip_locked=True).first()
        if not item:
            return None

        item.result_status = "processing"
        item.processing_started_at = now
        item.locked_until = lock_until
        item.locked_by = lock_owner
        item.updated_at = now
        return item

    def lock_issue_items(self, run_id: int, now: Any) -> int:
        """発行対象アイテムをロックする (Step2開始時)."""
        return (
            self.db.query(RpaRunItem)
            .filter(
                RpaRunItem.run_id == run_id,
                RpaRunItem.issue_flag.is_(True),
            )
            .update({"lock_flag": True, "updated_at": now}, synchronize_session=False)
        )

    def get_loop_summary(self, run_id: int, top_n: int = 5) -> dict[str, Any]:
        """PADループの集計情報を取得."""
        summary = (
            self.db.query(
                func.count(RpaRunItem.id).label("total"),
                func.sum(case((RpaRunItem.result_status.is_(None), 1), else_=0)).label("queued"),
                func.sum(case((RpaRunItem.result_status == "pending", 1), else_=0)).label(
                    "pending"
                ),
                func.sum(case((RpaRunItem.result_status == "processing", 1), else_=0)).label(
                    "processing"
                ),
                func.sum(case((RpaRunItem.result_status == "success", 1), else_=0)).label(
                    "success"
                ),
                func.sum(case((RpaRunItem.result_status == "failure", 1), else_=0)).label(
                    "failure"
                ),
                func.max(RpaRunItem.updated_at).label("last_activity_at"),
            )
            .filter(RpaRunItem.run_id == run_id)
            .first()
        )

        error_code_counts = (
            self.db.query(
                RpaRunItem.last_error_code.label("error_code"),
                func.count(RpaRunItem.id).label("count"),
            )
            .filter(
                RpaRunItem.run_id == run_id,
                RpaRunItem.result_status == "failure",
                RpaRunItem.last_error_code.is_not(None),
            )
            .group_by(RpaRunItem.last_error_code)
            .order_by(func.count(RpaRunItem.id).desc())
            .limit(top_n)
            .all()
        )

        if summary is None:
            total = 0
            queued = 0
            pending = 0
            processing = 0
            success = 0
            failure = 0
            last_activity_at = None
        else:
            total = int(summary.total or 0)
            queued = int(summary.queued or 0)
            pending = int(summary.pending or 0)
            processing = int(summary.processing or 0)
            success = int(summary.success or 0)
            failure = int(summary.failure or 0)
            last_activity_at = summary.last_activity_at

        done = success + failure
        remaining = total - done
        percent = (done / total * 100.0) if total else 0.0

        return {
            "total": total,
            "queued": queued,
            "pending": pending,
            "processing": processing,
            "success": success,
            "failure": failure,
            "last_activity_at": last_activity_at,
            "done": done,
            "remaining": remaining,
            "percent": percent,
            "error_code_counts": [
                {
                    "error_code": row.error_code,
                    "count": row[1] if len(row) > 1 else 0,  # type: ignore[index]
                }
                for row in error_code_counts
            ],
        }

    def get_activity(self, run_id: int, limit: int = 50) -> list[RpaRunItem]:
        """PADループの活動ログを取得."""
        return (
            self.db.query(RpaRunItem)
            .filter(RpaRunItem.run_id == run_id)
            .order_by(RpaRunItem.updated_at.desc())
            .limit(limit)
            .all()
        )

    # --- Master / Lot Lookup Methods for Orchestrator Logic ---

    def find_customer_item(self, customer_id: int, customer_part_no: str) -> CustomerItem | None:
        """得意先商品マスタ検索."""
        return (
            self.db.query(CustomerItem)
            .filter(
                CustomerItem.customer_id == customer_id,
                CustomerItem.customer_part_no == customer_part_no,
            )
            .first()
        )

    def find_product_by_maker_part_code(self, code: str) -> SupplierItem | None:
        """メーカー品番で商品検索."""
        return self.db.query(SupplierItem).filter(SupplierItem.maker_part_no == code).first()

    def find_active_lots(
        self,
        product_group_id: int,
        supplier_id: int | None = None,
    ) -> list[VLotDetails]:
        """有効なロット詳細を検索."""
        query = self.db.query(VLotDetails).filter(
            VLotDetails.product_group_id == product_group_id,
            VLotDetails.status == "active",
            VLotDetails.available_quantity > 0,
        )
        if supplier_id:
            query = query.filter(VLotDetails.supplier_id == supplier_id)

        return query.order_by(
            VLotDetails.expiry_date.asc().nullslast(),
            VLotDetails.received_date.asc(),
        ).all()
