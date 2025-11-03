import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Package,
  Edit,
  RefreshCcw,
} from "lucide-react";

type Props = {
  /** 受注全体の情報。行APIのみの場合は未指定でOK */
  order?: any;
  /** 受注明細（行） */
  line: any;
  /** ロット編集（モーダル起動） */
  onOpenAllocation: () => void;
  /** 受注単位の再マッチ。order_id がわかる場合のみ活性化推奨 */
  onRematch?: () => void;
};

function formatYmd(value?: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function OrderLineCard({
  order,
  line,
  onOpenAllocation,
  onRematch,
}: Props) {
  const unit = line?.unit ?? order?.unit ?? "";

  const allocatedLots: any[] = line?.allocated_lots ?? [];
  const allocatedTotal = useMemo(
    () =>
      allocatedLots.reduce(
        (s: number, a: any) => s + (a?.allocated_qty ?? 0),
        0
      ),
    [allocatedLots]
  );
  const totalQty = line?.qty ?? line?.quantity ?? 0;
  const remainingQty = Math.max(0, totalQty - allocatedTotal);
  const progressPct = Math.min(
    100,
    (allocatedTotal / Math.max(1, totalQty)) * 100
  );

  const statusKey = (line?.status || "open") as
    | "open"
    | "allocated"
    | "shipped"
    | "completed";
  const statusConfig = {
    open: { color: "bg-sky-500", label: "未処理", icon: AlertTriangle },
    allocated: { color: "bg-emerald-500", label: "引当済", icon: CheckCircle2 },
    shipped: { color: "bg-amber-500", label: "出荷済", icon: Package },
    completed: { color: "bg-gray-500", label: "完了", icon: CheckCircle2 },
  } as const;
  const status = statusConfig[statusKey] ?? statusConfig.open;
  const StatusIcon = status.icon;

  const progressClass =
    allocatedTotal > totalQty
      ? "[&>div]:bg-red-500"
      : allocatedTotal === totalQty
      ? "[&>div]:bg-emerald-500"
      : "[&>div]:bg-sky-500";

  const canRematch = Boolean(onRematch && (order?.id ?? line?.order_id));

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      {/* ヘッダー */}
      <div
        className={`flex items-center justify-between border-b p-4 ${status.color} bg-opacity-10`}>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold truncate">
              {line?.product_name ?? ""}{" "}
              <span className="text-muted-foreground">
                ({line?.product_code})
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-sm">
            <StatusIcon
              className={`h-4 w-4 ${status.color.replace("bg-", "text-")}`}
            />
            <span className="font-medium">{status.label}</span>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            受注日:{" "}
            <span className="font-medium text-foreground">
              {formatYmd(line?.order_date ?? order?.order_date)}
            </span>
          </div>
        </div>
      </div>

      {/* 本文：左右レイアウト（左=引当／右=情報） */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左：ロット引当 */}
          <div className="space-y-3">
            {/* 進捗 */}
            <div className="rounded-lg border p-3 bg-sky-50/40">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium">
                  引当進捗（行ID: {line?.id}）
                </span>
                <span className="font-semibold text-foreground">
                  {allocatedTotal} / {totalQty} {unit}
                </span>
              </div>
              <Progress value={progressPct} className={progressClass} />
              <div className="mt-2 text-xs text-muted-foreground">
                残り {remainingQty} {unit}
              </div>
            </div>

            {/* 既引当 */}
            {allocatedLots?.length > 0 && (
              <div className="rounded-lg border p-3 bg-emerald-50/30">
                <div className="font-medium text-sm mb-2">引当済み</div>
                <div className="space-y-1">
                  {allocatedLots.map((a: any) => (
                    <div
                      key={
                        a?.allocation_id ??
                        `${a?.lot_code}-${a?.warehouse_code}`
                      }
                      className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="font-mono truncate">{a?.lot_code}</div>
                        <div className="text-xs text-muted-foreground">
                          {a?.allocated_qty} {unit} / {a?.warehouse_code}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 候補編集起動 */}
            <div className="text-right">
              <Button size="sm" onClick={onOpenAllocation}>
                ロット編集
              </Button>
            </div>
          </div>

          {/* 右：受注情報＋倉庫配分 */}
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-sm font-medium text-sky-700">受注情報</h3>
            </div>

            <InfoRow
              label="製品"
              value={`${line?.product_code ?? ""} ${line?.product_name ?? ""}`}
              highlight
            />
            <InfoRow label="数量" value={`${totalQty} ${unit}`} />
            <InfoRow
              label="得意先"
              value={line?.customer_code ?? order?.customer_code ?? ""}
            />
            {(line?.supplier_code ?? order?.supplier_code) && (
              <InfoRow
                label="仕入先"
                value={line?.supplier_code ?? order?.supplier_code}
              />
            )}

            {/* 倉庫配分表示 */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">出荷倉庫</span>
                <Button variant="outline" size="sm" onClick={onOpenAllocation}>
                  <Edit className="mr-2 h-3 w-3" />
                  編集
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(line?.warehouse_allocations) &&
                line.warehouse_allocations.length > 0 ? (
                  line.warehouse_allocations.map((a: any, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-sm">
                      {a?.warehouse_code}: {a?.quantity} {unit}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">未設定</span>
                )}
              </div>
            </div>
          </div>

          {/* 下段：フォーキャスト（プレースホルダ） */}
          <div className="lg:col-span-2">
            <div className="border-b pb-3 mb-4">
              <h3 className="text-sm font-medium text-violet-700">
                フォーキャスト
              </h3>
            </div>
            <div className="text-sm text-muted-foreground">
              将来的に製品別の見込み数量を表示（API結線予定）
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span
        className={`text-sm ${
          highlight ? "font-semibold text-foreground" : "text-foreground/90"
        }`}>
        {value}
      </span>
    </div>
  );
}
