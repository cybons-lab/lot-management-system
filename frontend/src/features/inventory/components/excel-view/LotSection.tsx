import { Archive, Edit, FileText, Lock, Split, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { BigStatColumn } from "./subcomponents/BigStatColumn";
import { DateGrid } from "./subcomponents/DateGrid";
import { LotInfoGroups } from "./subcomponents/LotInfoGroups";
import { ShipmentTable } from "./subcomponents/ShipmentTable";
import { type LotBlockData } from "./types";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { LotArchiveDialog } from "@/features/inventory/components/LotArchiveDialog";
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
  onArchive?: (lotId: number, lotNumber?: string) => Promise<void> | void;
  isArchiving?: boolean;
  // Phase 9.2: Cell-level comments
  onCommentChange?: (lotId: number, dpId: number, date: string, comment: string | null) => void;
  // Phase 9.3: Manual shipment date
  onManualShipmentDateChange?: (
    lotId: number,
    dpId: number,
    date: string,
    shipmentDate: string | null,
  ) => void;
  // Phase 10.2: Lot split
  onSplitLot?: (lotId: number) => void;
  // Phase 11: Quantity update with reason
  onUpdateQuantity?: (lotId: number) => void;
  // Phase 10.10: Destination row ordering
  onReorderDestination?: (fromId: number, toId: number) => void;
}

/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
/* eslint-disable complexity -- 業務分岐を明示的に維持するため */
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
  isArchiving = false,
  onCommentChange,
  onManualShipmentDateChange,
  onSplitLot,
  onUpdateQuantity,
  onReorderDestination,
}: Props) {
  const {
    lotId,
    lotInfo,
    destinations,
    totalStock,
    totalShipment,
    warehouseName,
    warehouseCode,
    remarks,
  } = lot;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [remarksExpanded, setRemarksExpanded] = useState(false);
  const [localRemarks, setLocalRemarks] = useState(remarks || "");

  // Sync local remarks with prop changes
  useEffect(() => {
    setLocalRemarks(remarks || "");
  }, [remarks]);

  // ステータスを判定
  const statuses = getLotStatuses({
    status: lot.status || "",
    current_quantity: lot.totalStock,
    inspection_status: lot.inspectionStatus || "",
    expiry_date: lot.expiryDate || null,
    received_date: lot.receivedDate || null,
  });
  const primaryStatus = statuses[0] || "pending_receipt";
  const bgColor = getStatusBgColor(primaryStatus);
  const showLockIcon = isUnusable(primaryStatus);
  const canDelete = totalShipment === 0;
  const archiveLotInfo = {
    lot_number: lot.lotNumber ?? null,
    current_quantity: lot.totalStock,
    unit: lot.lotInfo.unit,
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`border border-slate-300 mt-6 text-xs shadow-sm rounded-md overflow-hidden min-w-max relative ${bgColor}`}
          >
            <div className="absolute top-2 right-2 z-20 flex gap-1">
              {onSplitLot && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                  onClick={() => onSplitLot(lotId)}
                  aria-label="ロットを分割"
                  title="分割"
                >
                  <Split className="h-4 w-4" />
                </Button>
              )}
              {onArchive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                  onClick={() => setArchiveDialogOpen(true)}
                  aria-label="ロットをアーカイブ"
                  title="アーカイブ"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                  onClick={() => setDeleteDialogOpen(true)}
                  aria-label="ロットを削除"
                  title={canDelete ? "削除" : "出荷数量があるため削除できません"}
                  disabled={!canDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {/* ロックアイコンオーバーレイ（使用不可ロットのみ） */}
            {showLockIcon && (
              <div className="absolute top-2 right-16 z-10 opacity-30">
                <Lock className="h-6 w-6 text-gray-600" />
              </div>
            )}
            {/* 備考アイコン（備考が存在する場合のみ） */}
            {remarks && (
              <div className="absolute top-2 left-2 z-10">
                <div className="relative">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-[auto_112px_320px_112px_1fr] min-h-[272px]">
              {/* 1. Lot Information (Fixed) */}
              <LotInfoGroups
                lotInfo={lotInfo}
                lotId={lotId}
                isEditing={isEditing}
                {...(onLotFieldChange && { onFieldChange: onLotFieldChange })}
                warehouseName={warehouseName || ""}
                warehouseCode={warehouseCode || ""}
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
                {...(onCoaDateChange && { onCoaDateChange })}
                {...(onAddDestination && { onAddDestination: () => onAddDestination(lotId) })}
                {...(onReorderDestination && { onReorderDestination })}
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
                {...(onQtyChange && { onQtyChange })}
                {...(onAddColumn && { onAddColumn })}
                {...(onCommentChange && { onCommentChange })}
                {...(onManualShipmentDateChange && { onManualShipmentDateChange })}
              />
            </div>

            {/* Phase 9.1: 備考セクション（折りたたみ可能） */}
            <div className="border-t border-slate-300">
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                onClick={() => setRemarksExpanded(!remarksExpanded)}
              >
                <span className="flex items-center gap-2">
                  <FileText
                    className={`h-4 w-4 ${remarks ? "text-amber-600" : "text-slate-500"}`}
                  />
                  備考
                  {remarks && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                      あり
                    </span>
                  )}
                </span>
                <span className="text-slate-400">{remarksExpanded ? "▲" : "▼"}</span>
              </button>
              {remarksExpanded && (
                <div className="px-4 py-3 bg-slate-50/50">
                  <textarea
                    className="w-full min-h-[80px] px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    placeholder="ロットに関する備考を入力..."
                    value={localRemarks}
                    onBlur={(e) => {
                      if (onLotFieldChange) {
                        onLotFieldChange(lotId, "remarks", e.target.value);
                      }
                    }}
                    onChange={(e) => {
                      setLocalRemarks(e.target.value);
                    }}
                  />
                </div>
              )}
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
          {onSplitLot && (
            <ContextMenuItem onClick={() => onSplitLot(lotId)}>
              <Split className="mr-2 h-4 w-4" />
              ロット分割
            </ContextMenuItem>
          )}
          {onUpdateQuantity && (
            <ContextMenuItem onClick={() => onUpdateQuantity(lotId)}>
              <FileText className="mr-2 h-4 w-4" />
              入庫数調整
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
              disabled={!canDelete}
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
      <LotArchiveDialog
        lot={archiveLotInfo}
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={async (lotNumber) => {
          if (!onArchive) return;
          await onArchive(lotId, lotNumber);
        }}
        isSubmitting={isArchiving}
      />
    </>
  );
}
