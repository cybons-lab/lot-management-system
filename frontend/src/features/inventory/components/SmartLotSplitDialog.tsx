import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AllocationItem {
  destinationId: number;
  destinationName: string;
  date: string;
  quantity: number;
  key: string;
}

interface SplitTarget {
  index: number;
  label: string;
  totalQuantity: number;
  allocations: AllocationItem[];
}

interface SmartLotSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotNumber: string;
  currentQuantity: number;
  allocations: AllocationItem[];
  onConfirm: (splitTargets: SplitTarget[]) => Promise<void>;
  isLoading?: boolean;
}

/* eslint-disable max-lines-per-function */
export function SmartLotSplitDialog({
  open,
  onOpenChange,
  lotNumber,
  currentQuantity,
  allocations,
  onConfirm,
  isLoading = false,
}: SmartLotSplitDialogProps) {
  const [step, setStep] = useState<"mode" | "assign" | "preview">("mode");
  const [splitCount, setSplitCount] = useState(2);
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  const handleModeSubmit = (count: number) => {
    setSplitCount(count);
    const initialAssignments: Record<string, number> = {};
    allocations.forEach((alloc) => {
      initialAssignments[alloc.key] = 0;
    });
    setAssignments(initialAssignments);
    setStep("assign");
  };

  const handleAssignmentChange = (key: string, targetIndex: number) => {
    setAssignments((prev) => ({ ...prev, [key]: targetIndex }));
  };

  const calculateSplitTargets = (): SplitTarget[] => {
    const targets: SplitTarget[] = Array.from({ length: splitCount }, (_, i) => ({
      index: i,
      label: i === 0 ? `ロット1（元: ${lotNumber}）` : `ロット${i + 1}（新規${i}）`,
      totalQuantity: 0,
      allocations: [],
    }));

    allocations.forEach((alloc) => {
      const targetIndex = assignments[alloc.key] ?? 0;
      targets[targetIndex].allocations.push(alloc);
      targets[targetIndex].totalQuantity += alloc.quantity;
    });

    return targets;
  };

  const handleConfirm = async () => {
    const targets = calculateSplitTargets();
    await onConfirm(targets);
    handleClose();
  };

  const handleClose = () => {
    setStep("mode");
    setSplitCount(2);
    setAssignments({});
    onOpenChange(false);
  };

  const splitTargets = step === "preview" ? calculateSplitTargets() : [];
  const totalAssignedQuantity = splitTargets.reduce((sum, t) => sum + t.totalQuantity, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ロットのスマート分割</DialogTitle>
          <DialogDescription>
            ロット番号: {lotNumber} | 入庫数: {currentQuantity}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: 分割数選択 */}
        {step === "mode" && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">分割数を選択</div>
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => handleModeSubmit(2)}
                  className="w-full text-left px-4 py-2 border rounded hover:bg-slate-50"
                >
                  2分割
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSubmit(3)}
                  className="w-full text-left px-4 py-2 border rounded hover:bg-slate-50"
                >
                  3分割
                </button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: 割付先の振り分け */}
        {step === "assign" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">納品予定の振り分け</h3>
              <p className="text-xs text-slate-600 mb-4">
                各納品予定をどのロットに割り当てるか選択してください
              </p>
            </div>

            <div className="space-y-3">
              {allocations.map((alloc) => (
                <div
                  key={alloc.key}
                  className="flex items-center gap-4 p-3 border border-slate-200 rounded-md"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{alloc.destinationName}</div>
                    <div className="text-xs text-slate-600">
                      {alloc.date} - {alloc.quantity}個
                    </div>
                  </div>
                  <select
                    value={String(assignments[alloc.key] ?? 0)}
                    onChange={(e) =>
                      handleAssignmentChange(alloc.key, parseInt(e.target.value, 10))
                    }
                    className="w-48 h-10 px-3 border border-slate-200 rounded-md text-sm"
                  >
                    {Array.from({ length: splitCount }, (_, i) => (
                      <option key={i} value={String(i)}>
                        {i === 0 ? `ロット1（元）` : `ロット${i + 1}（新規${i}）`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("mode")}>
                戻る
              </Button>
              <Button type="button" onClick={() => setStep("preview")}>
                プレビュー
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: プレビューと確認 */}
        {step === "preview" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">分割結果プレビュー</h3>
              <p className="text-xs text-slate-600 mb-4">
                以下の内容で分割を実行します。問題なければ「分割実行」をクリックしてください。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {splitTargets.map((target) => (
                <div key={target.index} className="border border-slate-200 rounded-md p-4">
                  <h4 className="font-semibold text-sm mb-2">{target.label}</h4>
                  <div className="text-xs text-slate-600 mb-2">
                    入庫数: {target.totalQuantity}個
                  </div>

                  {target.allocations.length > 0 ? (
                    <div className="space-y-1">
                      {target.allocations.map((alloc) => (
                        <div key={alloc.key} className="text-xs pl-2 border-l-2 border-slate-200">
                          {alloc.destinationName} - {alloc.date} ({alloc.quantity}個)
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">納品予定なし</div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span>元の入庫数:</span>
                <span>{currentQuantity}個</span>
              </div>
              <div className="flex justify-between">
                <span>割り当て済み数量:</span>
                <span>{totalAssignedQuantity}個</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>未割り当て:</span>
                <span
                  className={
                    currentQuantity - totalAssignedQuantity > 0
                      ? "text-amber-600"
                      : "text-green-600"
                  }
                >
                  {currentQuantity - totalAssignedQuantity}個
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("assign")}>
                戻る
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={isLoading}>
                {isLoading ? "分割中..." : "分割実行"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
