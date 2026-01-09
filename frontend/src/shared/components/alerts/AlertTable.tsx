/**
 * AlertTable component
 * Refactored to use DataTable component.
 *
 * Displays a table of alerts with navigation to target resources.
 */

import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { AlertBadge } from "./AlertBadge";

import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import type { AlertItem } from "@/shared/types/alerts";
import { formatDate } from "@/shared/utils/date";

interface AlertTableProps {
  alerts: AlertItem[];
  isLoading?: boolean;
  onAlertClick?: (alert: AlertItem) => void;
}

export function AlertTable({ alerts, isLoading = false, onAlertClick }: AlertTableProps) {
  const navigate = useNavigate();

  const handleAlertClick = (alert: AlertItem) => {
    if (onAlertClick) {
      onAlertClick(alert);
      return;
    }

    // Default navigation based on target type
    const { target } = alert;
    switch (target.resource_type) {
      case "order":
        navigate(`/orders/${target.id}`);
        break;
      case "lot":
        navigate(`/inventory/lots/${target.id}`);
        break;
      case "inventory_item":
        navigate(`/inventory/items/${target.id}`);
        break;
      case "forecast_daily":
        navigate(`/forecasts/${target.id}`);
        break;
    }
  };

  // 列定義
  const columns = useMemo<Column<AlertItem>[]>(
    () => [
      {
        id: "severity",
        header: "重要度",
        accessor: (row) => row.severity,
        cell: (row) => <AlertBadge severity={row.severity} />,
        width: 120,
        sortable: true,
      },
      {
        id: "title",
        header: "タイトル",
        accessor: (row) => row.title,
        cell: (row) => (
          <div>
            <div className="text-sm font-medium text-slate-900">{row.title}</div>
            {row.message && (
              <div className="mt-1 line-clamp-2 text-sm text-slate-500">{row.message}</div>
            )}
          </div>
        ),
        width: 400,
        sortable: true,
      },
      {
        id: "target",
        header: "対象",
        accessor: (row) => {
          const { target } = row;
          switch (target.resource_type) {
            case "order":
              return `受注 #${target.id}`;
            case "lot":
              return `ロット #${target.id}`;
            case "inventory_item":
              return `在庫 #${target.id}`;
            case "forecast_daily":
              return `予測 #${target.id}`;
            default:
              return "";
          }
        },
        width: 150,
        sortable: true,
      },
      {
        id: "occurred_at",
        header: "発生日時",
        accessor: (row) => row.occurred_at,
        cell: (row) => <span className="whitespace-nowrap">{formatDate(row.occurred_at)}</span>,
        width: 150,
        sortable: true,
      },
    ],
    [],
  );

  // 行アクション（矢印アイコン）
  const renderRowActions = () => {
    return <ChevronRight className="h-5 w-5 text-slate-400" />;
  };

  return (
    <DataTable
      data={alerts}
      columns={columns}
      getRowId={(row) => row.id}
      onRowClick={handleAlertClick}
      rowActions={renderRowActions}
      isLoading={isLoading}
      emptyMessage="アラートはありません"
    />
  );
}
