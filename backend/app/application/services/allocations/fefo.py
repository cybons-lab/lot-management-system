r"""FEFO引当プレビュー機能.

【設計意図】FEFO引当プレビューの設計判断:

1. なぜ「プレビュー」が必要なのか
   理由: 引当実行前に結果を確認
   業務的背景:
   - 自動車部品商社: 受注100件を一括引当する前に、
     「どのロットがどの受注に割り当てられるか」を確認したい
   → 期限切れリスクのあるロットが優先的に使われるか検証
   問題:
   - いきなり引当実行: 意図しない結果
   → 「期限の長いロットが先に使われてしまった」
   解決:
   - プレビュー機能: 実際の引当を作成せず、計画のみを返す
   → 確認後にコミット実行
   メリット:
   - 引当結果の事前確認
   - 誤った引当の防止

2. preview_fefo_allocation() の設計（L220-254）
   理由: 受注全体のFEFO引当計画を生成
   処理フロー:
   1. 受注の検証（L233）
      → validate_preview_eligibility() で状態チェック
   2. 明細ごとの引当計画生成（L238-252）
      → calculate_line_allocations() を呼び出し
   3. プレビュー結果の構築（L254）
      → build_preview_result() でサマリー作成
   重要な設計:
   - available_per_lot: 共有の在庫追跡辞書（L235）
   → 複数明細で同じロットを使う場合の在庫調整
   業務的意義:
   - 受注1件に対する完全なFEFO引当計画
   → 「この受注をFEFO引当したらどうなるか」

3. available_per_lot の共有設計（L235, L186-190）
   理由: 複数明細での在庫消費を正確に追跡
   問題:
   - 明細1: 製品A 50個
   - 明細2: 製品A 30個
   - ロットX: 製品A 60個
   → 明細1でロットXから50個引当
   → 明細2はロットXから10個のみ引当可能（60-50=10）
   解決:
   - available_per_lot 辞書で在庫を追跡
   → available_per_lot[lot_id] = 初期60個
   → 明細1処理後: available_per_lot[lot_id] = 10個
   → 明細2は10個のみ引当
   実装（L186-190）:
   - current_avail - allocated_qty_float
   → 引当後の残数を更新

4. validate_preview_eligibility() の設計（L17-30）
   理由: プレビュー可能な受注状態の検証
   許可される状態:
   - draft: 下書き
   - open: 未引当
   - part_allocated: 一部引当済み
   - allocated: 全量引当済み
   不許可の状態:
   - shipped: 出荷済み（引当変更不可）
   - closed: クローズ済み
   業務ルール:
   - 引当済みの受注でも再プレビュー可能
   → 「現在の引当を解除して、再度FEFOで引当したらどうなるか」
   → 最適化の検討

5. calculate_line_allocations() の設計（L51-197）
   理由: 1明細に対するFEFO引当計画の生成
   処理ステップ:
   1. 必要数量の計算（L68-74）
      → required_qty - already_allocated = remaining
   2. next_div の解決（L107）
      → 丸め処理の最小単位（梱包単位等）
   3. FEFO候補の取得（L131-137）
      → AllocationCandidateService 経由
   4. 候補の有効性検証（L143-162）
      → available_per_lot で実際の利用可能数量をチェック
   5. 引当実行（L165-167）
      → allocate_soft_for_forecast() で引当計算
   6. 結果のマッピング（L169-191）
      → AllocationResult → FefoLotPlan 変換

6. temp_allocations の設計（L140, L154-161）
   理由: allocate_soft_for_forecast() への入力調整
   背景:
   - allocate_soft_for_forecast(): 内部で temp_allocations を差し引く
   → effective_available = initial_available - temp_allocations[lot_id]
   問題:
   - available_per_lot で既に他明細の引当を考慮済み
   → allocator には current_tracked_available を見せたい
   解決:
   - temp_allocations[lot_id] = initial_avail - target_avail
   → allocator が見る値 = current_tracked_available
   実装（L158-160）:
   - used_elsewhere = max(Decimal(\"0\"), initial_avail - target_avail)
   → 他の明細で使用済みの数量

7. allocate_soft_for_forecast() の使用理由（L165-167）
   理由: Single Lot Fit + FEFO の統合アルゴリズム
   背景:
   - v2.x: シンプルなFEFOループ
   - v3.0: Single Lot Fit 優先
   → 1ロットで全量引当可能な場合は優先
   → 複数ロット分割は最小化
   メリット:
   - 出荷効率向上（ロット混載を削減）
   - 在庫管理の簡素化

8. warnings の設計（L96, L104, L120, L193-195）
   理由: プレビュー結果での問題点の明示
   警告例:
   - \"製品ID未設定\"（L96）
   - next_div 関連の警告（L120）
   - \"在庫不足: 製品 XXX に対して YY 足りません\"（L194）
   用途:
   - フロントエンドでの警告表示
   → ユーザーに問題を通知
   業務的意義:
   - 引当実行前に在庫不足を検出
   → 発注提案の生成

9. sorted_lines のソート（L238）
   理由: 明細IDの昇順で処理
   目的:
   - 処理順序の一貫性
   → テスト結果が安定
   - デバッグの容易性
   → 常に同じ順序で処理
   業務影響:
   - available_per_lot の更新順序が安定
   → 同じ受注に対するプレビュー結果が常に同じ

10. build_preview_result() の設計（L200-217）
    理由: プレビュー結果のサマリー生成
    集約内容:
    - order_id: 対象受注
    - lines: 明細ごとの引当計画
    - warnings: 全明細の警告を集約
    用途:
    - フロントエンドでの結果表示
    → 「この受注をFEFO引当すると、ロットXから50個、ロットYから30個」
    - 警告の一覧表示
    → 「在庫不足: 製品A 10個、製品B 20個」
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Order, OrderLine, Product

from .schemas import FefoLinePlan, FefoLotPlan, FefoPreviewResult
from .utils import (
    _existing_allocated_qty,
    _load_order,
    _resolve_next_div,
)


def validate_preview_eligibility(order: Order) -> None:
    """Validate order status for preview operation.

    Args:
        order: Order entity

    Raises:
        ValueError: If order status does not allow preview
    """
    if order.status not in {"draft", "open", "part_allocated", "allocated"}:
        raise ValueError(
            f"Order status '{order.status}' does not allow preview. "
            f"Allowed: draft, open, part_allocated, allocated"
        )


def load_order_for_preview(db: Session, order_id: int) -> Order:
    """Load order with validation for preview.

    Args:
        db: Database session
        order_id: Order ID

    Returns:
        Order: Order entity with lines

    Raises:
        ValueError: If order not found or status invalid
    """
    order = _load_order(db, order_id)
    validate_preview_eligibility(order)
    return order


def calculate_line_allocations(
    db: Session,
    line: OrderLine,
    order: Order,
    available_per_lot: dict[int, float],
) -> FefoLinePlan:
    """Calculate FEFO allocations for a single order line.

    Args:
        db: Database session
        line: Order line to allocate
        order: Parent order
        available_per_lot: Shared availability tracker

    Returns:
        FefoLinePlan: Allocation plan for this line
    """
    required_qty = float(
        line.converted_quantity
        if line.converted_quantity is not None
        else line.order_quantity or 0.0
    )
    already_allocated = _existing_allocated_qty(line)
    remaining = required_qty - already_allocated

    product_id = getattr(line, "product_id", None)
    warehouse_id = getattr(line, "warehouse_id", None)
    product_code = None
    warehouse_code = None

    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            product_code = product.maker_part_code

    # Get warehouse_code from warehouse_id if needed
    if warehouse_id and not warehouse_code:
        from app.infrastructure.persistence.models import Warehouse

        warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
        if warehouse:
            warehouse_code = warehouse.warehouse_code

    if not product_id:
        warning = f"製品ID未設定: order_line={line.id}"
        return FefoLinePlan(
            order_line_id=line.id,
            product_id=None,
            product_code="",
            warehouse_id=warehouse_id,
            warehouse_code=warehouse_code,
            required_qty=required_qty,
            already_allocated_qty=already_allocated,
            warnings=[warning],
        )

    next_div_value, next_div_warning = _resolve_next_div(db, order, line)
    line_plan = FefoLinePlan(
        order_line_id=line.id,
        product_id=product_id,
        product_code=product_code or "",
        warehouse_id=warehouse_id,
        warehouse_code=warehouse_code,
        required_qty=required_qty,
        already_allocated_qty=already_allocated,
        next_div=next_div_value,
    )

    if next_div_warning:
        line_plan.warnings.append(next_div_warning)

    # Allocate lots using unified allocator (Single Lot Fit + FEFO)
    if remaining > 0:
        from app.application.services.allocations.allocator import allocate_soft_for_forecast
        from app.application.services.allocations.candidate_service import (
            AllocationCandidateService,
        )
        from app.domain.allocation_policy import AllocationPolicy

        # Prepare candidates with correct availability context
        service = AllocationCandidateService(db)
        candidates = service.get_candidates(
            product_id=product_id,
            policy=AllocationPolicy.FEFO,
            warehouse_id=warehouse_id,
            min_available_qty=0.001,  # Filter out 0 qty candidates
        )

        valid_candidates = []
        temp_allocations: dict[int, Decimal] = {}

        for candidate in candidates:
            # Check availability tracking
            current_tracked_available = available_per_lot.get(
                candidate.lot_id, float(candidate.available_qty)
            )

            if current_tracked_available <= 0:
                continue

            # Calculate temporary allocated quantity to pass to allocator
            # allocator sees: effective_available = initial_available - temp_allocations[lot_id]
            # We want allocator to see: effective_available = current_tracked_available
            # => temp_allocations[lot_id] = initial_available - current_tracked_available
            initial_avail = Decimal(str(candidate.available_qty))
            target_avail = Decimal(str(current_tracked_available))

            # Ensure we don't pass negative temp allocations (should not happen if tracking is correct)
            used_elsewhere = max(Decimal("0"), initial_avail - target_avail)

            temp_allocations[candidate.lot_id] = used_elsewhere
            valid_candidates.append(candidate)

        # Execute allocation with temp_allocations dict
        results = allocate_soft_for_forecast(
            Decimal(str(remaining)), valid_candidates, temp_allocations
        )

        for res in results:
            # Map back to FefoLotPlan
            # Find the lot object (candidates has it)
            allocated_lot = next(l for l in candidates if l.lot_id == res.lot_id)
            allocated_qty_float = float(res.quantity)

            line_plan.allocations.append(
                FefoLotPlan(
                    lot_id=allocated_lot.lot_id,
                    allocate_qty=allocated_qty_float,
                    expiry_date=allocated_lot.expiry_date,
                    receipt_date=allocated_lot.receipt_date,
                    lot_number=allocated_lot.lot_number or "",
                )
            )

            # Update availability tracker
            current_avail = available_per_lot.get(
                allocated_lot.lot_id,
                float(allocated_lot.available_qty),
            )
            available_per_lot[allocated_lot.lot_id] = current_avail - allocated_qty_float
            remaining -= allocated_qty_float

    if remaining > 0:
        message = f"在庫不足: 製品 {product_code} に対して {remaining:.2f} 足りません"
        line_plan.warnings.append(message)

    return line_plan


def build_preview_result(
    order_id: int,
    line_plans: list[FefoLinePlan],
) -> FefoPreviewResult:
    """Build preview result from line plans.

    Args:
        order_id: Order ID
        line_plans: List of line allocation plans

    Returns:
        FefoPreviewResult: Complete preview result
    """
    all_warnings = []
    for line_plan in line_plans:
        all_warnings.extend(line_plan.warnings)

    return FefoPreviewResult(order_id=order_id, lines=line_plans, warnings=all_warnings)


def preview_fefo_allocation(db: Session, order_id: int) -> FefoPreviewResult:
    """FEFO引当プレビュー（状態: draft|open|part_allocated|allocated 許容）.

    Args:
        db: データベースセッション
        order_id: 注文ID

    Returns:
        FefoPreviewResult: 引当プレビュー結果

    Raises:
        ValueError: 注文が見つからない、または状態が不正な場合
    """
    order = load_order_for_preview(db, order_id)

    available_per_lot: dict[int, float] = {}
    preview_lines: list[FefoLinePlan] = []

    sorted_lines = sorted(order.order_lines, key=lambda l: l.id)
    for line in sorted_lines:
        required_qty = float(
            line.converted_quantity
            if line.converted_quantity is not None
            else line.order_quantity or 0.0
        )
        already_allocated = _existing_allocated_qty(line)
        remaining = required_qty - already_allocated

        if remaining <= 0:
            continue

        line_plan = calculate_line_allocations(db, line, order, available_per_lot)
        preview_lines.append(line_plan)

    return build_preview_result(order_id, preview_lines)
