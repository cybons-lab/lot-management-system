/**
 * LotAllocationPage - ロット引当ページ（完全リファクタリング版）
 *
 * 構成:
 * - 3カラムレイアウト（広い画面）：
 *   - 左カラム: 受注一覧（OrdersPane）
 *   - 中カラム: 明細一覧（OrderLinesPane）
 *   - 右カラム: ロット引当パネル（LotAllocationPanel）
 *
 * レスポンシブ対応:
 * - 広い画面（1280px以上）: 3カラムレイアウト
 * - 中程度の画面（768px〜1280px）: 2カラムレイアウト（受注＋明細を左、ロットを右）
 * - 狭い画面（768px未満）: 明細行内にインライン表示
 *
 * 状態管理:
 * - useState: selectedOrderId, selectedOrderLineId（ページ内ローカル）
 * - useState: lotAllocations（ページ内ローカル引当入力）
 *
 * APIフロー:
 * 1. 受注一覧取得: GET /api/orders
 * 2. 受注詳細取得: GET /api/orders/{order_id}
 * 3. ロット候補取得: GET /api/allocation-candidates?order_line_id=...
 * 4. 引当確定: POST /api/allocations/commit
 */

/**
 * LotAllocationPage - ロット引当ページ
 * UIレイアウトと表示責務のみを持つコンポーネント
 */
import { useState, useEffect } from "react";
import { OrdersPane } from "../components/OrdersPane";
import { OrderLinesPane } from "../components/OrderLinesPane";
import { LotAllocationPanel } from "../components/LotAllocationPanel";
import { useLotAllocation } from "../hooks/useLotAllocation";

export function LotAllocationPage() {
  // カスタムフックから全ロジックとデータを取得
  const logic = useLotAllocation();

  // レスポンシブ判定（UIの責務としてここに残す）
  const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 1280);
  const [isMediumScreen, setIsMediumScreen] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1280,
  );
  const renderInlineLots = !isWideScreen && !isMediumScreen;

  useEffect(() => {
    const handleResize = () => {
      setIsWideScreen(window.innerWidth >= 1280);
      setIsMediumScreen(window.innerWidth >= 768 && window.innerWidth < 1280);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 共通のパネルprops（DRY原則）
  const commonPanelProps = {
    orderLine: logic.selectedOrderLine,
    candidateLots: logic.candidateLots,
    lotAllocations: logic.lotAllocations,
    onLotAllocationChange: logic.changeAllocation,
    onFillAllFromLot: logic.fillAllFromLot,
    onAutoAllocate: logic.autoAllocate,
    onClearAllocations: logic.clearAllocations,
    onSaveAllocations: logic.saveAllocations,
    canSave: logic.canSaveAllocations,
    isOverAllocated: logic.isOverAllocated,
    remainingQty: logic.remainingQty,
    isLoading: logic.isLoadingCandidates,
    error: logic.candidatesError,
    isSaving: logic.isSavingAllocations,
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 広い画面: 3カラム (受注 | 明細 | ロット) */}
      {isWideScreen && (
        <>
          <div className="w-80">
            <OrdersPane
              orders={logic.orders}
              selectedOrderId={logic.selectedOrderId}
              onSelectOrder={logic.selectOrder}
              customerMap={logic.customerMap}
              isLoading={logic.isLoadingOrders}
              error={logic.ordersError}
            />
          </div>
          <div className="flex-1">
            <OrderLinesPane
              orderLines={logic.orderLines}
              selectedOrderLineId={logic.selectedOrderLineId}
              onSelectOrderLine={logic.selectOrderLine}
              orderDetail={logic.orderDetail}
              renderInlineLots={false}
              lineStockStatus={logic.lineStockStatus}
              isLoading={logic.isLoadingDetail}
              error={logic.detailError}
            />
          </div>
          <div className="w-96">
            <LotAllocationPanel {...commonPanelProps} layout="sidePane" />
          </div>
        </>
      )}

      {/* 中画面: 2カラム (受注・明細 | ロット) */}
      {isMediumScreen && (
        <>
          <div className="flex flex-1 flex-col">
            <div className="h-1/2 overflow-hidden border-b">
              <OrdersPane
                orders={logic.orders}
                selectedOrderId={logic.selectedOrderId}
                onSelectOrder={logic.selectOrder}
                customerMap={logic.customerMap}
                isLoading={logic.isLoadingOrders}
                error={logic.ordersError}
              />
            </div>
            <div className="h-1/2 overflow-hidden">
              <OrderLinesPane
                orderLines={logic.orderLines}
                selectedOrderLineId={logic.selectedOrderLineId}
                onSelectOrderLine={logic.selectOrderLine}
                orderDetail={logic.orderDetail}
                renderInlineLots={false}
                lineStockStatus={logic.lineStockStatus}
                isLoading={logic.isLoadingDetail}
                error={logic.detailError}
              />
            </div>
          </div>
          <div className="w-96">
            <LotAllocationPanel {...commonPanelProps} layout="sidePane" />
          </div>
        </>
      )}

      {/* 狭い画面: インライン表示 */}
      {renderInlineLots && (
        <div className="flex flex-1 flex-col">
          <div className="h-1/3 overflow-hidden border-b">
            <OrdersPane
              orders={logic.orders}
              selectedOrderId={logic.selectedOrderId}
              onSelectOrder={logic.selectOrder}
              customerMap={logic.customerMap}
              isLoading={logic.isLoadingOrders}
              error={logic.ordersError}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <OrderLinesPane
              orderLines={logic.orderLines}
              selectedOrderLineId={logic.selectedOrderLineId}
              onSelectOrderLine={logic.selectOrderLine}
              orderDetail={logic.orderDetail}
              renderInlineLots={true}
              lineStockStatus={logic.lineStockStatus}
              inlineLotContent={(line) => (
                // インラインの場合、行データ(line)はOrderLinesPaneから渡されるものを使う
                // ただし選択中の明細IDと一致する場合のみパネルを表示するなど、
                // 既存のOrderLinesPaneの実装に依存しますが、
                // ここでは選択状態をPropsで渡しているので機能します。
                <LotAllocationPanel
                  {...commonPanelProps}
                  orderLine={line} // 明示的に行を上書き
                  layout="inline"
                />
              )}
              isLoading={logic.isLoadingDetail}
              error={logic.detailError}
            />
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {logic.toast && (
        <div
          className={`fixed right-6 bottom-6 rounded-lg px-4 py-3 text-sm shadow-lg transition-opacity ${
            logic.toast.variant === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
          }`}
        >
          {logic.toast.message}
        </div>
      )}
    </div>
  );
}
