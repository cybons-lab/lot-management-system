

// --- Helper Functions ---

type AllocationStatus = 'over' | 'completed' | 'shortage' | 'unallocated';

/**
 * 明細行の引当状態を判定する単一関数
 * @param line - 明細行データ
 * @param allocations - UI上の引当マップ {lotId: quantity}
 * @param required - 必要数量
 * @param isOver - 過剰引当フラグ
 * @returns 引当状態
 */
export function getLineAllocationStatus(
  line: { id?: number; allocated_quantity?: string | number | null; status?: string | null },
  allocations: Record<number, number>,
  required: number,
  isOver: boolean
): AllocationStatus {
  const uiAllocated = Object.values(allocations).reduce((sum, qty) => sum + qty, 0);
  const dbAllocated = Number(line.allocated_quantity || 0);
  const totalAllocated = Math.max(uiAllocated, dbAllocated);

  // 判定優先度:
  // 1. Over: allocated > required
  if (isOver) return 'over';

  // 2. Complete: allocated >= required かつ required > 0
  //    またはDBステータスがallocated/completed（tentativeは含めない）
  const dbStatus = line.status;
  const isAllocatedInDB = dbStatus === "allocated" || dbStatus === "completed";

  // required=0の明細は引当完了とみなさない
  // また、tentativeは仮引当なので完了とはみなさない
  if (required > 0 && totalAllocated >= required && !isOver) {
    return 'completed';
  }

  // DBステータスがallocated/completedの場合も完了とみなす
  if (isAllocatedInDB && required > 0) {
    return 'completed';
  }

  // 3. Shortage: allocated > 0 && allocated < required
  if (totalAllocated > 0 && totalAllocated < required) return 'shortage';

  // 4. Unallocated: allocated === 0
  return 'unallocated';
}

// --- Main Component (Deprecated) ---

export function FlatAllocationList() {
  return (
    <div className="p-4 text-center text-gray-500">
      <p>現在メンテナンス中です。</p>
      <p className="text-sm">LineBasedAllocationListを使用してください。</p>
    </div>
  );
}
