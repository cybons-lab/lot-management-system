// frontend/src/features/admin/components/SeedSimulateDialog.tsx
/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";
import { Checkbox } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import {
  getSimulateProgress,
  getSimulateResult,
  postSimulateSeedData,
  type SimulateProgressResponse,
  type SimulateResultResponse,
  type SimulateSeedRequest,
} from "@/features/admin/api/admin-simulate";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_FORM: SimulateSeedRequest = {
  profile: null,
  random_seed: null,
  warehouses: 2,
  customers: 3,
  suppliers: 2,
  products: 5,
  lots: 10,
  orders: 5,
  lot_split_max_per_line: 1,
  order_line_items_per_order: 1,
  destinations_max_per_order: 5,
  forecasts: 1,
  save_snapshot: true,
  snapshot_name: null,
  use_last_snapshot: false,
  case_mix: null,
};

export function SeedSimulateDialog({ open, onOpenChange }: Props) {
  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<SimulateProgressResponse | null>(null);
  const [result, setResult] = React.useState<SimulateResultResponse | null>(null);
  const [form, setForm] = React.useState<SimulateSeedRequest>(DEFAULT_FORM);

  const preview = React.useMemo(() => {
    const toNumber = (value: number | null | undefined) =>
      typeof value === "number" && !Number.isNaN(value) ? value : null;

    const counts = {
      warehouses: toNumber(form.warehouses),
      customers: toNumber(form.customers),
      suppliers: toNumber(form.suppliers),
      products: toNumber(form.products),
      lots: toNumber(form.lots),
      orders: toNumber(form.orders),
      forecasts: toNumber(form.forecasts),
    } as const;

    const sumIfKnown = (keys: (keyof typeof counts)[]) =>
      keys.every((key) => counts[key] != null)
        ? keys.reduce((acc, key) => acc + (counts[key] as number), 0)
        : null;

    const masters = sumIfKnown(["warehouses", "customers", "suppliers", "products"]);
    const inventory = counts.lots;
    const ordersTotal = counts.orders;
    const forecastsTotal = counts.forecasts;

    const overall =
      masters != null && inventory != null && ordersTotal != null && forecastsTotal != null
        ? masters + inventory + ordersTotal + forecastsTotal
        : null;

    return {
      counts,
      totals: {
        masters,
        inventory,
        orders: ordersTotal,
        forecasts: forecastsTotal,
        overall,
      },
    };
  }, [form]);

  const formatCount = (value: number | null | undefined) =>
    value == null ? "プロファイル既定" : value.toLocaleString();
  const formatTotal = (value: number | null | undefined) =>
    value == null ? "-" : value.toLocaleString();

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
      if (profile === "__default__") {
        return {
          ...prev,
          profile: null,
          warehouses: DEFAULT_FORM.warehouses,
        };
      }

      const warehousesMap: Record<string, number> = {
        small: 6,
        medium: 8,
        large_near: 9,
      };

      return {
        ...prev,
        profile,
        warehouses: warehousesMap[profile] ?? prev.warehouses ?? DEFAULT_FORM.warehouses,
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
              <Select value={form.profile ?? "__default__"} onValueChange={handleProfileChange}>
                <SelectTrigger>
                  <SelectValue placeholder="プロファイルを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">API既定（最小構成）</SelectItem>
                  <SelectItem value="small">Small（小規模）</SelectItem>
                  <SelectItem value="medium">Medium（中規模）</SelectItem>
                  <SelectItem value="large_near">Large Near（大規模寄り）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* パラメータ設定 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <Label>倉庫数（1〜10）</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.warehouses ?? DEFAULT_FORM.warehouses}
                  onChange={(e) => {
                    const nextValue = e.target.value
                      ? Number(e.target.value)
                      : DEFAULT_FORM.warehouses;
                    setForm((prev) => ({
                      ...prev,
                      warehouses: nextValue,
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>顧客数（0以上）</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.customers ?? ""}
                  placeholder="プロファイル既定"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customers: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>仕入先数（0以上）</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.suppliers ?? ""}
                  placeholder="プロファイル既定"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      suppliers: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>製品数（0以上）</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.products ?? ""}
                  placeholder="プロファイル既定"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      products: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>ロット数（0以上）</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.lots ?? ""}
                  placeholder="プロファイル既定"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lots: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>受注数（0以上）</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.orders ?? ""}
                  placeholder="プロファイル既定"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      orders: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>受注明細行上限（1〜5）</Label>
                <Select
                  value={String(
                    form.order_line_items_per_order ?? DEFAULT_FORM.order_line_items_per_order,
                  )}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      order_line_items_per_order: Number(v),
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
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ロット分割上限（1〜3）</Label>
                <Select
                  value={String(form.lot_split_max_per_line ?? DEFAULT_FORM.lot_split_max_per_line)}
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
                <Label>需要予測データ</Label>
                <div className="flex items-center gap-2 rounded border p-2">
                  <Checkbox
                    id="forecasts"
                    checked={(form.forecasts ?? 0) > 0}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        forecasts: checked === true ? 1 : 0,
                      }))
                    }
                  />
                  <Label htmlFor="forecasts" className="m-0 cursor-pointer">
                    需要予測を生成する
                  </Label>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>納品先上限（固定=5）</Label>
                <Input type="text" value="5" disabled className="bg-muted" />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold">送信前プレビュー</h3>
              <div className="space-y-3 rounded border p-4 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">倉庫:</span>{" "}
                    {formatCount(preview.counts.warehouses)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">顧客:</span>{" "}
                    {formatCount(preview.counts.customers)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">仕入先:</span>{" "}
                    {formatCount(preview.counts.suppliers)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">製品:</span>{" "}
                    {formatCount(preview.counts.products)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">ロット:</span>{" "}
                    {formatCount(preview.counts.lots)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">受注:</span>{" "}
                    {formatCount(preview.counts.orders)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">需要予測:</span>{" "}
                    {formatCount(preview.counts.forecasts)}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="text-muted-foreground text-xs font-semibold uppercase">
                    Totals
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Masters:</span>{" "}
                      {formatTotal(preview.totals.masters)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Inventory:</span>{" "}
                      {formatTotal(preview.totals.inventory)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Orders:</span>{" "}
                      {formatTotal(preview.totals.orders)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Forecasts:</span>{" "}
                      {formatTotal(preview.totals.forecasts)}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Overall:</span>{" "}
                      {formatTotal(preview.totals.overall)}
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground text-xs">
                  空欄の項目はプロファイル既定値が適用されます。
                </p>
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
                      <span className="text-muted-foreground">需要予測:</span>{" "}
                      {result.summary.forecasts}
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
