/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { useMemo } from "react";

import type { DeliveryPlace } from "../api";

import { Button } from "@/components/ui";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";

export type DeliveryPlaceWithValidTo = DeliveryPlace & { valid_to?: string };

interface DeliveryPlacesTableProps {
  customers: { id: number; customer_code: string; customer_name: string }[];
  deliveryPlaces: DeliveryPlace[];
  isLoading: boolean;
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  onEdit: (row: DeliveryPlaceWithValidTo) => void;
  onSoftDelete: (row: DeliveryPlaceWithValidTo) => void;
  onPermanentDelete: (row: DeliveryPlaceWithValidTo) => void;
  onRestore: (row: DeliveryPlaceWithValidTo) => void;
}

const isInactive = (validTo?: string | null) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

export function DeliveryPlacesTable({
  customers,
  deliveryPlaces,
  isLoading,
  sort,
  onSortChange,
  onEdit,
  onSoftDelete,
  onPermanentDelete,
  onRestore,
}: DeliveryPlacesTableProps) {
  const customerMap = useMemo(() => {
    return new Map(
      customers.map((c) => [
        c.id,
        { customer_code: c.customer_code, customer_name: c.customer_name },
      ]),
    );
  }, [customers]);

  const columns = useMemo<Column<DeliveryPlaceWithValidTo>[]>(
    () => [
      {
        id: "delivery_place_code",
        header: "納入先コード",
        cell: (row) => (
          <div className="flex items-center">
            <span>{row.delivery_place_code}</span>
            {isInactive(row.valid_to) && (
              <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                削除済
              </span>
            )}
          </div>
        ),
        sortable: true,
      },
      {
        id: "delivery_place_name",
        header: "納入先名",
        cell: (row) => (
          <div className={isInactive(row.valid_to) ? "text-muted-foreground" : ""}>
            {row.delivery_place_name}
          </div>
        ),
        sortable: true,
      },
      {
        id: "customer_id",
        header: "得意先",
        cell: (row) => {
          const customer = customerMap.get(row.customer_id);
          if (!customer) return `ID: ${row.customer_id}`;
          return `${customer.customer_code} - ${customer.customer_name}`;
        },
        sortable: true,
      },
      {
        id: "jiku_code",
        header: "次区コード",
        cell: (row) => row.jiku_code || "-",
      },
      {
        id: "actions",
        header: "操作",
        cell: (row) => {
          const inactive = isInactive(row.valid_to);
          if (inactive) {
            return (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(row);
                  }}
                  title="復元"
                >
                  <RotateCcw className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPermanentDelete(row);
                  }}
                  title="完全に削除"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            );
          }
          return (
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
                  onSoftDelete(row);
                }}
              >
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [customerMap, onEdit, onSoftDelete, onPermanentDelete, onRestore],
  );

  return (
    <DataTable
      data={deliveryPlaces as DeliveryPlaceWithValidTo[]}
      columns={columns}
      sort={sort}
      onSortChange={onSortChange}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      emptyMessage="納入先が登録されていません"
    />
  );
}
