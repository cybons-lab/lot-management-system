/**
 * lot-columns.tsx
 *
 * ロット一覧テーブルのカラム定義
 */

import { format, parse } from "date-fns";

import type { Column } from "@/shared/components/data/DataTable";
import { LotStatusBadge } from "@/shared/components/data/StatusBadge";
import type { LotUI } from "@/shared/libs/normalize";
import { formatCodeAndName } from "@/shared/libs/utils";
import { getLotStatuses } from "@/shared/utils/status";

/**
 * 納品先情報を取得
 */
function getDeliveryPlace(lot: LotUI): string {
  const codeUnknown = (lot as unknown as { delivery_place_code?: unknown }).delivery_place_code;
  const nameUnknown = (lot as unknown as { delivery_place_name?: unknown }).delivery_place_name;
  const code =
    typeof codeUnknown === "string" || codeUnknown == null
      ? (codeUnknown as string | null | undefined)
      : undefined;
  const name =
    typeof nameUnknown === "string" || nameUnknown == null
      ? (nameUnknown as string | null | undefined)
      : undefined;
  return formatCodeAndName(code, name) || "—";
}

/**
 * 日付をフォーマット（タイムゾーン変換なし）
 * YYYY-MM-DD形式の日付文字列を yyyy/MM/dd にフォーマット
 */
function formatDate(date: string | null | undefined): string {
  if (!date || date === "-") return "-";
  // タイムゾーンの影響を受けないよう、parseを使用
  const parsed = parse(date, "yyyy-MM-dd", new Date());
  return format(parsed, "yyyy/MM/dd");
}

/**
 * ロット一覧テーブルのカラム定義を生成
 */
// eslint-disable-next-line max-lines-per-function
export function createLotColumns(): Column<LotUI>[] {
  return [
    {
      id: "lot_number",
      header: "ロット番号",
      cell: (lot) => (
        <span className="font-medium whitespace-nowrap text-slate-900">
          {lot.lot_number || "-"}
        </span>
      ),
      sortable: true,
      width: "150px",
    },
    {
      id: "product_code",
      header: "メーカー品番",
      cell: (lot) => (
        <span
          className={`whitespace-nowrap ${lot.product_deleted ? "text-muted-foreground line-through" : "text-slate-900"}`}
        >
          {lot.product_code}
        </span>
      ),
      sortable: true,
      width: "150px",
    },
    {
      id: "product_name",
      header: "製品名",
      cell: (lot) => (
        <span
          className={`whitespace-nowrap ${lot.product_deleted ? "text-muted-foreground italic" : ""}`}
        >
          {lot.product_name}
          {lot.product_deleted && (
            <span className="ml-1 text-xs text-orange-500" title="この製品は削除されています">
              (削除済)
            </span>
          )}
        </span>
      ),
      width: "200px",
    },
    {
      id: "delivery_place",
      header: "納品先",
      cell: (lot) => {
        const text = getDeliveryPlace(lot);
        return <span className="whitespace-nowrap">{text}</span>;
      },
      sortable: true,
      width: "180px",
    },
    {
      id: "current_quantity",
      header: "現在在庫",
      cell: (lot) => {
        const qty = Number(lot.current_quantity);
        return (
          <span className={`whitespace-nowrap ${qty > 0 ? "font-semibold" : "text-slate-400"}`}>
            {qty.toLocaleString()}
          </span>
        );
      },
      sortable: true,
      align: "right",
      width: "120px",
    },
    {
      id: "unit",
      header: "単位",
      cell: (lot) => lot.unit,
      align: "center",
    },
    {
      id: "receipt_date",
      header: "入荷日",
      cell: (lot) => formatDate(lot.receipt_date),
      sortable: true,
    },
    {
      id: "expiry_date",
      header: "有効期限",
      cell: (lot) => formatDate(lot.expiry_date),
      sortable: true,
    },
    {
      id: "status",
      header: "ステータス",
      cell: (lot) => {
        const statuses = getLotStatuses(lot);
        // 最も重要なステータスを表示（複数ある場合は最優先のみ）
        const primaryStatus = statuses[0] ?? "available";
        return <LotStatusBadge status={primaryStatus} />;
      },
      sortable: true,
      align: "center",
    },
    {
      id: "origin",
      header: "発生源",
      cell: (lot) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium">{lot.origin_type}</span>
          {lot.origin_reference && <span className="text-slate-500">{lot.origin_reference}</span>}
        </div>
      ),
      sortable: false,
      enableHiding: true,
    },
    {
      id: "shipping_date",
      header: "出荷日",
      cell: (lot) => formatDate(lot.shipping_date),
      sortable: true,
      enableHiding: true,
    },
  ];
}
