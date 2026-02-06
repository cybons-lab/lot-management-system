/**
 * 出荷用マスタテーブルカラム定義
 */

import { Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui";
import { type Column } from "@/shared/components/data/DataTable";
import { type components } from "@/types/api";

type ShippingMasterCurated = components["schemas"]["ShippingMasterCuratedResponse"];

interface ShippingMasterColumnsOptions {
  onEdit?: (row: ShippingMasterCurated) => void;
  onDelete?: (row: ShippingMasterCurated) => void;
}

/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
export function createShippingMasterColumns(
  options?: ShippingMasterColumnsOptions,
): Column<ShippingMasterCurated>[] {
  return [
    {
      id: "id",
      header: "ID",
      accessor: (row) => row.id,
      minWidth: 80,
    },
    {
      id: "customer_code",
      header: "得意先コード",
      accessor: (row) => <span className="font-medium">{row.customer_code}</span>,
      minWidth: 120,
    },
    {
      id: "customer_name",
      header: "得意先名",
      accessor: (row) => row.customer_name || "-",
      minWidth: 150,
    },
    {
      id: "material_code",
      header: "材質コード",
      accessor: (row) => <span className="font-medium">{row.material_code}</span>,
      minWidth: 120,
    },
    {
      id: "jiku_code",
      header: "次区",
      accessor: (row) => <span className="font-medium">{row.jiku_code}</span>,
      minWidth: 100,
    },
    {
      id: "jiku_match_pattern",
      header: "次区マッチングルール",
      accessor: (row) => (row as { jiku_match_pattern?: string | null }).jiku_match_pattern || "-",
      minWidth: 160,
    },
    {
      id: "warehouse_code",
      header: "倉庫コード",
      accessor: (row) => row.warehouse_code || "-",
      minWidth: 120,
    },
    {
      id: "delivery_note_product_name",
      header: "納入書品名",
      accessor: (row) => (
        <div className="max-w-xs truncate" title={row.delivery_note_product_name || undefined}>
          {row.delivery_note_product_name || "-"}
        </div>
      ),
      minWidth: 200,
    },
    {
      id: "customer_part_no",
      header: "先方品番",
      accessor: (row) => row.customer_part_no || "-",
      minWidth: 150,
    },
    {
      id: "maker_part_no",
      header: "メーカー品番",
      accessor: (row) => row.maker_part_no || "-",
      minWidth: 150,
    },
    {
      id: "maker_code",
      header: "メーカーコード",
      accessor: (row) => row.maker_code || "-",
      minWidth: 120,
    },
    {
      id: "maker_name",
      header: "メーカー名",
      accessor: (row) => row.maker_name || "-",
      minWidth: 150,
    },
    {
      id: "supplier_code",
      header: "仕入先コード",
      accessor: (row) => row.supplier_code || "-",
      minWidth: 120,
    },
    {
      id: "supplier_name",
      header: "仕入先名",
      accessor: (row) => row.supplier_name || "-",
      minWidth: 150,
    },
    {
      id: "staff_name",
      header: "担当者名",
      accessor: (row) => row.staff_name || "-",
      minWidth: 120,
    },
    {
      id: "delivery_place_code",
      header: "納入先コード",
      accessor: (row) => row.delivery_place_code || "-",
      minWidth: 120,
    },
    {
      id: "delivery_place_name",
      header: "納入先名",
      accessor: (row) => row.delivery_place_name || "-",
      minWidth: 150,
    },
    {
      id: "delivery_place_abbr",
      header: "納入先略称",
      accessor: (row) => row.delivery_place_abbr || "-",
      minWidth: 120,
    },
    {
      id: "shipping_warehouse",
      header: "出荷倉庫",
      accessor: (row) => row.shipping_warehouse || "-",
      minWidth: 150,
    },
    {
      id: "shipping_slip_text",
      header: "出荷票テキスト",
      accessor: (row) => (
        <div className="max-w-xs truncate" title={row.shipping_slip_text || undefined}>
          {row.shipping_slip_text || "-"}
        </div>
      ),
      minWidth: 200,
    },
    {
      id: "transport_lt_days",
      header: "輸送LT(日)",
      accessor: (row) => row.transport_lt_days?.toString() || "-",
      minWidth: 100,
    },
    {
      id: "has_order",
      header: "発注",
      accessor: (row) => (row.has_order ? "有" : "無"),
      minWidth: 80,
    },
    {
      id: "remarks",
      header: "備考",
      accessor: (row) => (
        <div className="max-w-xs truncate" title={row.remarks || undefined}>
          {row.remarks || "-"}
        </div>
      ),
      minWidth: 200,
    },
    {
      id: "actions",
      header: "操作",
      accessor: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              options?.onEdit?.(row);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              options?.onDelete?.(row);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      minWidth: 120,
    },
  ];
}
