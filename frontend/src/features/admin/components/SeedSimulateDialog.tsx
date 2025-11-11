// frontend/src/features/admin/components/SeedSimulateDialog.tsx
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSimulateProgress,
  getSimulateResult,
  postSimulateSeedData,
  type SimulateProgressResponse,
  type SimulateResultResponse,
  type SimulateSeedRequest,
} from "@/features/admin/api/admin-simulate";
import { useToast } from "@/hooks/ui";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SeedSimulateDialog({ open, onOpenChange }: Props) {
  const toast = useToast();
  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<SimulateProgressResponse | null>(null);
  const [result, setResult] = React.useState<SimulateResultResponse | null>(null);
  const [form, setForm] = React.useState<SimulateSeedRequest>({
    profile: "medium",
    random_seed: null,
    warehouses: 8,
    lot_split_max_per_line: 3,
    order_line_items_per_order: 5,
    destinations_max_per_order: 5,
    save_snapshot: true,
    snapshot_name: null,
    use_last_snapshot: false,
  });

  // ポーリング用interval
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // シミュレーション開始
  const startMut = useMutation({
    mutationFn: (payload: SimulateSeedRequest) => postSimulateSeedData(payload),
    onSuccess: (res) => {
      setTaskId(res.task_id);
      setProgress(null);
      setResult(null);
      toast.success(res.message);
      startPolling(res.task_id);
    },
    onError: (err: any) => {
      toast.error(`失敗: ${err?.message || "Unknown error"}`);
    },
  });

  // 進捗ポーリング
  const startPolling = (tid: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const pollProgress = async () => {
      try {
        const prog = await getSimulateProgress(tid);
        setProgress(prog);

        // 完了・失敗時は結果取得
        if (prog.status === "completed" || prog.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);

          if (prog.status === "completed") {
            const res = await getSimulateResult(tid);
            setResult(res);
          } else if (prog.status === "failed") {
            setResult({ success: false, error: prog.error || "Unknown error" });
          }
        }
      } catch (err: any) {
        console.error("Progress polling error:", err);
      }
    };

    pollProgress(); // 初回即実行
    intervalRef.current = setInterval(pollProgress, 3000); // 3秒ごと
  };

  // ダイアログクローズ時にポーリング停止
  React.useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTaskId(null);
      setProgress(null);
      setResult(null);
    }
  }, [open]);

  const handleStart = () => {
    startMut.mutate(form);
  };

  const handleClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onOpenChange(false);
  };

  // プロファイル変更時に倉庫数を更新
  const handleProfileChange = (profile: string) => {
    setForm((prev) => {
      const warehousesMap: Record<string, number> = {
        small: 6,
        medium: 8,
        large_near: 9,
      };
      return {
        ...prev,
        profile,
        warehouses: warehousesMap[profile] || 8,
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl">
        <DialogHeader>
          <DialogTitle>テストデータ生成シミュレーション</DialogTitle>
          <DialogDescription>
            プロファイルを選択し、パラメータを設定してテストデータを生成します
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-200px)] overflow-auto">
          <div className="space-y-6 p-1">
            {/* プロファイル選択 */}
            <div className="space-y-2">
              <Label>プロファイル</Label>
              <Select value={form.profile || "medium"} onValueChange={handleProfileChange}>
                <SelectTrigger>
                  <SelectValue placeholder="プロファイルを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small（小規模）</SelectItem>
                  <SelectItem value="medium">Medium（中規模）</SelectItem>
                  <SelectItem value="large_near">Large Near（大規模寄り）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* パラメータ設定 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Random Seed</Label>
                <Input
                  type="number"
                  placeholder="自動生成"
                  value={form.random_seed || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      random_seed: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>倉庫数（5〜10）</Label>
                <Input
                  type="number"
                  min={5}
                  max={10}
                  value={form.warehouses || 8}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      warehouses: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>ロット分割上限（1〜3）</Label>
                <Select
                  value={String(form.lot_split_max_per_line || 3)}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      lot_split_max_per_line: Number(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>受注明細行上限（表示のみ=5）</Label>
                <Input type="text" value="5" disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>納品先上限（固定=5）</Label>
                <Input type="text" value="5" disabled className="bg-muted" />
              </div>
            </div>

            {/* スナップショット設定 */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-snapshot"
                  checked={form.save_snapshot || false}
                  onCheckedChange={(checked: boolean) =>
                    setForm((prev) => ({ ...prev, save_snapshot: checked }))
                  }
                />
                <Label htmlFor="save-snapshot">スナップショット保存</Label>
              </div>

              {form.save_snapshot && (
                <div className="space-y-2">
                  <Label>スナップショット名（オプション）</Label>
                  <Input
                    placeholder="自動生成"
                    value={form.snapshot_name || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        snapshot_name: e.target.value || null,
                      }))
                    }
                  />
                </div>
              )}
            </div>

            {/* 進捗表示 */}
            {progress && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">進捗状況</h3>
                    {taskId && <div className="text-xs opacity-70">Task: {taskId}</div>}
                  </div>
                  <Badge variant={progress.status === "completed" ? "default" : "secondary"}>
                    {progress.status === "running" && (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    )}
                    {progress.phase} - {progress.progress_pct}%
                  </Badge>
                </div>

                <div className="bg-muted h-[200px] overflow-auto rounded border p-3">
                  <div className="space-y-1 font-mono text-xs">
                    {progress.logs.map((log, i) => (
                      <div key={i} className="text-muted-foreground">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 結果表示 */}
            {result && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <h3 className="text-sm font-semibold">
                    {result.success ? "生成完了" : "生成失敗"}
                  </h3>
                </div>

                {result.success && result.summary && (
                  <div className="bg-muted grid grid-cols-2 gap-3 rounded border p-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">倉庫:</span>{" "}
                      {result.summary.warehouses}
                    </div>
                    <div>
                      <span className="text-muted-foreground">ロット:</span> {result.summary.lots}
                    </div>
                    <div>
                      <span className="text-muted-foreground">受注:</span> {result.summary.orders}
                    </div>
                    <div>
                      <span className="text-muted-foreground">受注明細:</span>{" "}
                      {result.summary.order_lines}
                    </div>
                    <div>
                      <span className="text-muted-foreground">引当:</span>{" "}
                      {result.summary.allocations}
                    </div>
                    <div>
                      <span className="text-muted-foreground">スナップショットID:</span>{" "}
                      {result.snapshot_id || "-"}
                    </div>

                    <div className="col-span-2 space-y-1 border-t pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">ロット分割:</span>
                        <Badge
                          variant={
                            result.summary.cap_checks.lot_split === "OK" ? "default" : "destructive"
                          }
                        >
                          {result.summary.cap_checks.lot_split}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">納品先:</span>
                        <Badge
                          variant={
                            result.summary.cap_checks.destinations === "OK"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {result.summary.cap_checks.destinations}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">明細行:</span>
                        <Badge
                          variant={
                            result.summary.cap_checks.order_lines === "OK"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {result.summary.cap_checks.order_lines}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">在庫整合式:</span>
                        <Badge
                          variant={result.summary.stock_equation_ok ? "default" : "destructive"}
                        >
                          {result.summary.stock_equation_ok ? "OK" : "NG"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {result.error && (
                  <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {result.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            閉じる
          </Button>
          <Button
            onClick={handleStart}
            disabled={startMut.isPending || progress?.status === "running"}
          >
            {startMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                開始中...
              </>
            ) : (
              "実行"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
