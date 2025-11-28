import { LineBasedAllocationList } from "../components/allocation-list/LineBasedAllocationList";
import { useLotAllocation } from "../hooks/useLotAllocation";

import * as styles from "./LotAllocationPage.styles";

export function LotAllocationPage() {
  // カスタムフックから全ロジックとデータを取得
  // ※注意: フラット化に伴い、useLotAllocation側も「選択中の1行」ではなく
  // 「表示中の全行」のデータを扱えるように修正が必要になる場合があります
  const logic = useLotAllocation();

  return (
    <div className={styles.pageContainer}>
      {/* 新しいフラットリストコンポーネント 
         画面幅いっぱいに広がり、スクロールで操作します
      */}
      <LineBasedAllocationList
        orders={logic.orders}
        customerMap={logic.customerMap}
        productMap={logic.productMap}
        onSaveAllocations={logic.saveAllocations}
        isLoading={logic.isLoadingOrders}
        getLineAllocations={(lineId) => logic.getAllocationsForLine(lineId)}
        onLotAllocationChange={logic.changeAllocation}
        onAutoAllocate={logic.autoAllocate}
        onClearAllocations={logic.clearAllocations}
        // 新規追加: ステータスとバリデーション
        lineStatuses={logic.lineStatuses}
        isOverAllocated={logic.isOverAllocated}
        getCandidateLots={logic.getCandidateLots}
      />

      {/* トースト通知 (既存機能を維持) */}
      {logic.toast && (
        <div
          className={styles.toast({
            variant: logic.toast.variant === "error" ? "error" : "default",
          })}
        >
          {logic.toast.message}
        </div>
      )}
    </div>
  );
}
