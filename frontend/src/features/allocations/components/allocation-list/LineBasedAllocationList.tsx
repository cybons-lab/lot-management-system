import { AllocationProvider } from "../AllocationProvider";

import { AllocationListContent } from "./line-based/AllocationListContent";
import type { AllocationListProps } from "./line-based/types";
import { useAllocationListLogic } from "./line-based/useAllocationListLogic";

/**
 * LineBasedAllocationList - 明細単位でフラットに表示するコンポーネント
 *
 * ユーザーの要望により、Order Cardのデザイン（ヘッダー情報など）を維持したまま、
 * 明細行ごとにカードを分けて表示する（非正規化表示）。
 *
 * AllocationProviderを使用してハンドラーとコンテキストデータをJotai atomに設定し、
 * 子コンポーネントがuseAllocationContextで直接アクセスできるようにする。
 */
export function LineBasedAllocationList(props: AllocationListProps) {
  const { orders, isLoading } = props;

  const logic = useAllocationListLogic(props);

  if (isLoading) return <div className="p-8 text-center text-gray-500">データを読み込み中...</div>;
  if (orders.length === 0)
    return <div className="p-8 text-center text-gray-500">表示対象の受注がありません</div>;

  return (
    <AllocationProvider
      productMap={props.productMap}
      customerMap={props.customerMap}
      lineStatuses={props.lineStatuses}
      activeLineId={logic.activeLineId}
      getLineAllocations={props.getLineAllocations}
      getCandidateLots={props.getCandidateLots}
      isOverAllocated={props.isOverAllocated}
      onLotAllocationChange={props.onLotAllocationChange}
      onAutoAllocate={props.onAutoAllocate}
      onClearAllocations={props.onClearAllocations}
      onSaveAllocations={props.onSaveAllocations}
    >
      <AllocationListContent logic={logic} />
    </AllocationProvider>
  );
}
