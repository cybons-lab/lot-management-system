/* eslint-disable max-lines-per-function */
import { Pencil } from "lucide-react";
import React, { useMemo } from "react";

import type { OcrResultItem } from "../api";

import {
  EditableDateCell,
  EditableShippingSlipCell,
  EditableTextCell,
  StatusReviewCell,
} from "./OcrResultsTableCells";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";

const formatItemNo = (itemNo: string | null) => {
  if (!itemNo) return "-";
  return itemNo.length > 6 ? itemNo.slice(-6) : itemNo;
};

const getContentValue = (row: OcrResultItem, key: string): string => {
  const value = row.content?.[key];
  if (typeof value === "string") {
    return value.trim() ? value : "-";
  }
  if (value === null || value === undefined) {
    return "-";
  }
  return String(value);
};

export const useOcrColumns = (isReadOnly: boolean, onEdit?: (row: OcrResultItem) => void) => {
  const columns = useMemo<Column<OcrResultItem>[]>(
    () =>
      [
        // Edit button column
        {
          id: "edit_action",
          header: "",
          accessor: (row: OcrResultItem) =>
            !isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-slate-200"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onEdit?.(row);
                }}
                title="詳細編集"
              >
                <Pencil className="h-4 w-4 text-slate-500" />
              </Button>
            ),
          width: 40,
          enableHiding: false,
          sticky: "left" as const,
        },
        {
          id: "status_icon",
          header: "ステータス",
          accessor: (row: OcrResultItem) => <StatusReviewCell row={row} />,
          minWidth: 60, // Icon only, narrower
          sticky: "left" as const,
        },
        {
          id: "lot_no",
          header: "ロットNo",
          accessor: (row: OcrResultItem) =>
            isReadOnly ? (
              <div className="flex flex-col gap-0.5 text-sm">
                <span>{row.manual_lot_no_1 || row.lot_no || "-"}</span>
                <span className="text-slate-400">{row.manual_lot_no_2 || "-"}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <EditableTextCell row={row} field="lotNo1" placeholder="" />
                <EditableTextCell row={row} field="lotNo2" placeholder="2行目" />
              </div>
            ),
          minWidth: 180,
        },
        {
          id: "inbound_no",
          header: "入庫No",
          accessor: (row: OcrResultItem) =>
            isReadOnly ? (
              <div className="flex flex-col gap-0.5 text-sm">
                <span>{row.manual_inbound_no || row.inbound_no || "-"}</span>
                <span className="text-slate-400">{row.manual_inbound_no_2 || "-"}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <EditableTextCell row={row} field="inboundNo1" placeholder="" />
                <EditableTextCell row={row} field="inboundNo2" placeholder="2行目" />
              </div>
            ),
          minWidth: 180,
        },
        {
          id: "quantity",
          header: "数量",
          accessor: (row: OcrResultItem) =>
            isReadOnly ? (
              <div className="flex flex-col gap-0.5 text-sm text-right">
                <span>{row.manual_quantity_1 || "-"}</span>
                <span className="text-slate-400">{row.manual_quantity_2 || "-"}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <EditableTextCell
                  row={row}
                  field="quantity1"
                  placeholder=""
                  inputClassName="text-right"
                />
                <EditableTextCell
                  row={row}
                  field="quantity2"
                  placeholder="2行目"
                  inputClassName="text-right"
                />
              </div>
            ),
          minWidth: 80,
        },
        {
          id: "shipping_date_input",
          header: "出荷日",
          accessor: (row: OcrResultItem) =>
            isReadOnly ? (
              <span className="text-sm">
                {row.manual_shipping_date || row.calculated_shipping_date || "-"}
              </span>
            ) : (
              <EditableDateCell row={row} field="shippingDate" />
            ),
          minWidth: 120,
        },
        {
          id: "shipping_slip_text_input",
          header: "出荷票テキスト",
          accessor: (row: OcrResultItem) =>
            isReadOnly ? (
              <span className="text-sm whitespace-pre-wrap">
                {row.manual_shipping_slip_text || "-"}
              </span>
            ) : (
              <EditableShippingSlipCell row={row} />
            ),
          minWidth: 320,
        },
        {
          id: "shipping_slip_source",
          header: "取得元",
          accessor: () => <span className="text-sm text-gray-600">OCR</span>,
          minWidth: 80,
        },
        {
          id: "material_code",
          header: "材質コード",
          accessor: (row: OcrResultItem) =>
            isReadOnly ? (
              <span className="text-sm">
                {row.manual_material_code || row.material_code || "-"}
              </span>
            ) : (
              <EditableTextCell row={row} field="materialCode" hasWarning={row.master_not_found} />
            ),
          minWidth: 120,
        },
        {
          id: "jiku_code",
          header: "次区",
          accessor: (row: OcrResultItem) =>
            isReadOnly ? (
              <span className="text-sm">{row.manual_jiku_code || row.jiku_code || "-"}</span>
            ) : (
              <EditableTextCell row={row} field="jikuCode" hasWarning={row.jiku_format_error} />
            ),
          minWidth: 80,
        },
        {
          id: "delivery_date",
          header: "納期",
          accessor: (row: OcrResultItem) =>
            isReadOnly ? (
              <span className="text-sm">{row.delivery_date || "-"}</span>
            ) : (
              <EditableDateCell row={row} field="deliveryDate" />
            ),
          minWidth: 110,
        },
        {
          id: "delivery_quantity",
          header: "納入量",
          accessor: (row: OcrResultItem) =>
            isReadOnly ? (
              <span className="text-right text-sm block">
                {row.manual_delivery_quantity || row.delivery_quantity || "-"}
              </span>
            ) : (
              <EditableTextCell row={row} field="deliveryQuantity" inputClassName="text-right" />
            ),
          minWidth: 100,
        },

        {
          id: "sap_supplier",
          header: "SAP仕入先",
          accessor: (row: OcrResultItem) => {
            if (!row.sap_supplier_code) return "-";
            return (
              <div className="flex flex-col">
                <span className="text-sm font-medium">{row.sap_supplier_code}</span>
                {row.sap_supplier_name && (
                  <span className="text-xs text-gray-500">{row.sap_supplier_name}</span>
                )}
              </div>
            );
          },
          minWidth: 130,
        },
        {
          id: "sap_qty_unit",
          header: "SAP数量単位",
          accessor: (row: OcrResultItem) => row.sap_qty_unit || "-",
          minWidth: 110,
        },
        {
          id: "sap_maker_item",
          header: "SAPメーカー品番",
          accessor: (row: OcrResultItem) => row.sap_maker_item || "-",
          minWidth: 150,
        },
        {
          id: "item_no",
          header: "アイテムNo",
          accessor: (row: OcrResultItem) => formatItemNo(row.item_no),
          minWidth: 100,
        },
        {
          id: "customer_part_no",
          header: "先方品番",
          accessor: (row: OcrResultItem) => row.customer_part_no || "-",
          minWidth: 120,
        },
        {
          id: "maker_part_no",
          header: "メーカー品番",
          accessor: (row: OcrResultItem) => row.maker_part_no || "-",
          minWidth: 130,
        },
        {
          id: "order_unit",
          header: "数量単位",
          accessor: (row: OcrResultItem) => row.order_unit || "-",
          minWidth: 90,
        },
        {
          id: "customer_code",
          header: "得意先",
          accessor: (row: OcrResultItem) => row.customer_code || "-",
          minWidth: 110,
        },
        {
          id: "supplier_code",
          header: "仕入先",
          accessor: (row: OcrResultItem) => row.supplier_code || "-",
          minWidth: 110,
        },
        {
          id: "supplier_name",
          header: "仕入先名称",
          accessor: (row: OcrResultItem) => row.supplier_name || "-",
          minWidth: 140,
        },
        {
          id: "shipping_warehouse_code",
          header: "出荷倉庫",
          accessor: (row: OcrResultItem) => row.shipping_warehouse_code || "-",
          minWidth: 110,
        },
        {
          id: "shipping_warehouse_name",
          header: "出荷倉庫名称",
          accessor: (row: OcrResultItem) => row.shipping_warehouse_name || "-",
          minWidth: 140,
        },
        {
          id: "delivery_place_code",
          header: "納入場所",
          accessor: (row: OcrResultItem) => row.delivery_place_code || "-",
          minWidth: 120,
        },
        {
          id: "delivery_place_name",
          header: "納入場所名称",
          accessor: (row: OcrResultItem) => row.delivery_place_name || "-",
          minWidth: 140,
        },
        {
          id: "remarks",
          header: "備考",
          accessor: (row: OcrResultItem) => getContentValue(row, "備考"),
          minWidth: 160,
        },
      ].filter((col) => !isReadOnly || (col.id !== "status_icon" && col.id !== "edit_action")),
    [isReadOnly, onEdit],
  );

  return columns;
};
