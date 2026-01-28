/**
 * Column definitions for WarehouseDeliveryRoutes table
 */
import { Pencil, Trash2 } from "lucide-react";

import type { WarehouseDeliveryRoute } from "../api";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

/* eslint-disable max-lines-per-function */
export function createColumns(
  onEdit: (row: WarehouseDeliveryRoute) => void,
  onDelete: (row: WarehouseDeliveryRoute) => void,
): Column<WarehouseDeliveryRoute>[] {
  return [
    {
      id: "warehouse_code",
      header: "倉庫",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-medium text-gray-900">{row.warehouse_code}</span>
          <span className="text-xs text-gray-500">{row.warehouse_name}</span>
        </div>
      ),
      sortable: true,
      width: "180px",
    },
    {
      id: "delivery_place_code",
      header: "納入先",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-medium text-gray-900">
            {row.delivery_place_code}
          </span>
          <span className="text-xs text-gray-500">{row.delivery_place_name}</span>
        </div>
      ),
      sortable: true,
      width: "200px",
    },
    {
      id: "product",
      header: "品番",
      cell: (row) =>
        row.product_group_id ? (
          <div className="flex flex-col">
            <span className="font-mono text-sm text-gray-900">{row.maker_part_code}</span>
            <span
              className="max-w-[150px] truncate text-xs text-gray-500"
              title={row.product_name ?? ""}
            >
              {row.product_name}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">経路デフォルト</span>
        ),
      sortable: false,
      width: "180px",
    },
    {
      id: "transport_lead_time_days",
      header: "輸送LT（日）",
      cell: (row) => (
        <span className="text-lg font-bold text-blue-600">{row.transport_lead_time_days}</span>
      ),
      sortable: true,
      width: "100px",
    },
    {
      id: "is_active",
      header: "状態",
      cell: (row) =>
        row.is_active ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            有効
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
            無効
          </span>
        ),
      sortable: true,
      width: "80px",
    },
    {
      id: "updated_at",
      header: "更新日時",
      cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.updated_at)}</span>,
      sortable: true,
      width: "120px",
    },
    {
      id: "actions",
      header: "操作",
      cell: (row) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
          >
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
/* eslint-enable max-lines-per-function */
