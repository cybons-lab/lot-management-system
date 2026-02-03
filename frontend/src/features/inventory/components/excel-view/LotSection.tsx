import { Archive, Edit, Lock, Trash2 } from "lucide-react";
import { useState } from "react";

import { BigStatColumn } from "./subcomponents/BigStatColumn";
import { DateGrid } from "./subcomponents/DateGrid";
import { LotInfoGroups } from "./subcomponents/LotInfoGroups";
import { ShipmentTable } from "./subcomponents/ShipmentTable";
import { type LotBlockData } from "./types";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getLotStatuses, type LotStatus } from "@/shared/utils/status";

/**
 * ステータスに応じた背景色を決定
 */
function getStatusBgColor(status: LotStatus): string {
  switch (status) {
    case "pending_receipt":
      return "bg-amber-100/80";
    case "expired":
      return "bg-red-100/80";
    case "rejected":
      return "bg-rose-100/80";
    case "qc_hold":
      return "bg-amber-50/70";
    case "empty":
      return "bg-slate-100/70";
    default:
      return "bg-white";
  }
}

/**
 * 使用不可ロットかどうかを判定
 */
function isUnusable(status: LotStatus): boolean {
  return ["pending_receipt", "expired", "rejected", "qc_hold"].includes(status);
}

interface Props {
  lot: LotBlockData;
  dateColumns: string[];
  isEditing?: boolean;
  onQtyChange?: (lotId: number, dpId: number, date: string, value: number) => void;
  onLotFieldChange?: (lotId: number, field: string, value: string) => void;
  onCoaDateChange?: (lotId: number, dpId: number, date: string, coaDate: string | null) => void;
  onAddColumn?: (date: Date) => void;
  onAddDestination?: (lotId: number) => void;
  onEdit?: (lotId: number) => void;
  onDelete?: (lotId: number) => void;
  onArchive?: (lotId: number) => void;
}

/* eslint-disable max-lines-per-function */
export function LotSection({
  lot,
  dateColumns,
  isEditing = true,
  onQtyChange,
  onLotFieldChange,
  onCoaDateChange,
  onAddColumn,
  onAddDestination,
  onEdit,
  onDelete,
  onArchive,
}: Props) {
  const { lotId, lotInfo, destinations, totalStock, totalShipment, warehouseName, warehouseCode } =
    lot;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // ステータスを判定
  const statuses = getLotStatuses({
    status: lot.status,
    current_quantity: lot.totalStock,
    inspection_status: lot.inspectionStatus,
    expiry_date: lot.expiryDate,
    received_date: lot.receivedDate,
  });
  const primaryStatus = statuses[0];
  const bgColor = getStatusBgColor(primaryStatus);
  const showLockIcon = isUnusable(primaryStatus);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`border border-slate-300 mt-6 text-xs shadow-sm rounded-md overflow-hidden min-w-max relative ${bgColor}`}
          >
            {/* ロックアイコンオーバーレイ（使用不可ロットのみ） */}
            {showLockIcon && (
              <div className="absolute top-2 right-2 z-10 opacity-30">
                <Lock className="h-6 w-6 text-gray-600" />
              </div>
            )}
            <div className="flex shrink-0">
              {/* 1. Lot Information (Fixed) */}
              <LotInfoGroups
                lotInfo={lotInfo}
                lotId={lotId}
                isEditing={isEditing}
                onFieldChange={onLotFieldChange}
                warehouseName={warehouseName}
                warehouseCode={warehouseCode}
              />

              {/* 2. Inbound Qty (Big Vertical) */}
              <BigStatColumn
                label="入庫数"
                value={lotInfo.inboundQty}
                unit={lotInfo.unit}
                variant="blue"
              />

              {/* 3. Destination and Shipment Total */}
              <ShipmentTable
                destinations={destinations}
                dateColumns={dateColumns}
                totalShipment={totalShipment}
                lotId={lotId}
                onCoaDateChange={onCoaDateChange}
                onAddDestination={() => onAddDestination?.(lotId)}
              />

              {/* 4. Current Stock (Big Vertical) */}
              <BigStatColumn
                label="現在の在庫"
                value={totalStock}
                unit={lotInfo.unit}
                variant="emerald"
              />

              {/* 5. Date Columns (Scrollable Area) */}
              <DateGrid
                dateColumns={dateColumns}
                destinations={destinations}
                lotId={lotId}
                onQtyChange={onQtyChange}
                onAddColumn={onAddColumn}
              />
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onEdit && (
            <ContextMenuItem onClick={() => onEdit(lotId)}>
              <Edit className="mr-2 h-4 w-4" />
              編集
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          {onArchive && (
            <ContextMenuItem onClick={() => setArchiveDialogOpen(true)}>
              <Archive className="mr-2 h-4 w-4" />
              アーカイブ
            </ContextMenuItem>
          )}
          {onDelete && (
            <ContextMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          onDelete?.(lotId);
          setDeleteDialogOpen(false);
        }}
        title="ロットを削除しますか？"
        description={`ロット番号: ${lotInfo.lotNo} を削除します。この操作は取り消せません。`}
        confirmLabel="削除"
        variant="destructive"
      />

      {/* アーカイブ確認ダイアログ */}
      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={() => {
          onArchive?.(lotId);
          setArchiveDialogOpen(false);
        }}
        title="ロットをアーカイブしますか？"
        description={`ロット番号: ${lotInfo.lotNo} をアーカイブします。アーカイブしたロットは後で復元できます。`}
        confirmLabel="アーカイブ"
        variant="default"
      />
    </>
  );
}
