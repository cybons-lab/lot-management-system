/**
 * LotAllocationPage - ロット引当ページ（フラットリスト版）
 *
 * 変更点:
 * - 3ペイン/レスポンシブ分岐を全廃止
 * - 新コンポーネント FlatAllocationList を配置するだけのシンプルな構成に変更
 * - トースト通知機能は維持
 */
import { FlatAllocationList } from "../components/shared/FlatAllocationList";
import { useLotAllocation } from "../hooks/useLotAllocation";

export function LotAllocationPage() {
  // カスタムフックから全ロジックとデータを取得
  // ※注意: フラット化に伴い、useLotAllocation側も「選択中の1行」ではなく
  // 「表示中の全行」のデータを扱えるように修正が必要になる場合があります
  const logic = useLotAllocation();

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {/* 新しいフラットリストコンポーネント 
         画面幅いっぱいに広がり、スクロールで操作します
      */}
      <FlatAllocationList
        orders={logic.orders}
        customerMap={logic.customerMap}
        productMap={logic.productMap}
        // データの取得・操作関数を渡す
        getLineAllocations={(lineId) => logic.getAllocationsForLine(lineId)}
        onLotAllocationChange={logic.changeAllocation}
        onAutoAllocate={logic.autoAllocate}
        onClearAllocations={logic.clearAllocations}
        onSaveAllocations={logic.saveAllocations}
        isLoading={logic.isLoadingOrders}
        // 新規追加: ステータスとバリデーション
        lineStatuses={logic.lineStatuses}
        isOverAllocated={logic.isOverAllocated}
      />

      {/* トースト通知 (既存機能を維持) */}
      {logic.toast && (
        <div
          className={`animate-in slide-in-from-bottom-2 fixed right-6 bottom-6 z-50 rounded-lg px-4 py-3 text-sm shadow-lg transition-opacity ${
            logic.toast.variant === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
          }`}
        >
          {logic.toast.message}
        </div>
      )}
    </div>
  );
}
