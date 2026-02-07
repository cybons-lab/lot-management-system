import { toast } from "sonner";

import {
  AddDestinationDialog,
  type NewDestinationFormData,
} from "../subcomponents/AddDestinationDialog";
import { type ExcelViewData } from "../types";

import { type AllocationTransfer } from "@/features/inventory/api";
import { LotQuantityUpdateDialog } from "@/features/inventory/components/LotQuantityUpdateDialog";
import { QuickLotIntakeDialog } from "@/features/inventory/components/QuickLotIntakeDialog";
import { SmartLotSplitDialog } from "@/features/inventory/components/SmartLotSplitDialog";

interface ExcelViewDialogsProps {
  productId: number;
  supplierId?: number;
  customerItem?: {
    customer_id: number;
    customer_name: string;
    id: number;
  };
  data?: ExcelViewData;

  // Intake Dialog
  isLotIntakeDialogOpen: boolean;
  setIsLotIntakeDialogOpen: (open: boolean) => void;

  // Smart Split Dialog
  selectedLotForSmartSplit: {
    lotId: number;
    lotNumber: string;
    currentQuantity: number;
  } | null;
  smartSplitDialogOpen: boolean;
  setSmartSplitDialogOpen: (open: boolean) => void;
  onSmartSplitConfirm: (
    lotId: number,
    transfers: AllocationTransfer[],
    splitCount: number,
  ) => Promise<void>;
  isSmartSplitPending: boolean;

  // Quantity Update Dialog
  selectedLotForQuantityUpdate: {
    lotId: number;
    lotNumber: string;
    currentQuantity: number;
  } | null;
  quantityUpdateDialogOpen: boolean;
  setQuantityUpdateDialogOpen: (open: boolean) => void;
  onQuantityUpdateConfirm: (lotId: number, newQuantity: number, reason: string) => Promise<void>;
  isQuantityUpdatePending: boolean;

  // Add Destination Dialog
  selectedLotIdForAddDest: number | null;
  setSelectedLotIdForAddDest: (id: number | null) => void;
  onAddDestinationConfirm: (formData: NewDestinationFormData) => Promise<void>;
}

/**
 * ExcelView ページで使用されるすべてのダイアログを集約して管理するコンポーネント
 */
export function ExcelViewDialogs({
  productId,
  supplierId,
  customerItem,
  data,
  isLotIntakeDialogOpen,
  setIsLotIntakeDialogOpen,
  selectedLotForSmartSplit,
  smartSplitDialogOpen,
  setSmartSplitDialogOpen,
  onSmartSplitConfirm,
  isSmartSplitPending,
  selectedLotForQuantityUpdate,
  quantityUpdateDialogOpen,
  setQuantityUpdateDialogOpen,
  onQuantityUpdateConfirm,
  isQuantityUpdatePending,
  selectedLotIdForAddDest,
  setSelectedLotIdForAddDest,
  onAddDestinationConfirm,
}: ExcelViewDialogsProps) {
  return (
    <>
      {/* 新規ロット受入ダイアログ */}
      {isLotIntakeDialogOpen && (
        <QuickLotIntakeDialog
          open={isLotIntakeDialogOpen}
          onOpenChange={setIsLotIntakeDialogOpen}
          initialProductId={productId}
          {...(supplierId ? { initialSupplierId: supplierId } : {})}
        />
      )}

      {/* スマート分割ダイアログ */}
      {selectedLotForSmartSplit && (
        <SmartLotSplitDialog
          open={smartSplitDialogOpen}
          onOpenChange={setSmartSplitDialogOpen}
          lotNumber={selectedLotForSmartSplit.lotNumber}
          currentQuantity={selectedLotForSmartSplit.currentQuantity}
          allocations={
            data?.lots
              .find((l) => l.lotId === selectedLotForSmartSplit.lotId)
              ?.destinations.flatMap((dest) =>
                Object.entries(dest.shipmentQtyByDate)
                  .filter(([_, qty]) => qty > 0)
                  .map(([date, qty]) => ({
                    destinationId: dest.deliveryPlaceId,
                    destinationName: `${dest.destination.customerName} - ${dest.destination.deliveryPlaceName}`,
                    date,
                    quantity: qty,
                    key: `${dest.deliveryPlaceId}-${date}`,
                  })),
              ) || []
          }
          onConfirm={async (splitTargets) => {
            const transfers: AllocationTransfer[] = [];
            const splitCount = splitTargets.length;

            splitTargets.forEach((target) => {
              target.allocations.forEach((alloc) => {
                const lot = data?.lots.find((l) => l.lotId === selectedLotForSmartSplit.lotId);
                const dest = lot?.destinations.find(
                  (d) => d.deliveryPlaceId === alloc.destinationId,
                );

                if (dest) {
                  transfers.push({
                    lot_id: selectedLotForSmartSplit.lotId,
                    delivery_place_id: alloc.destinationId,
                    customer_id: dest.customerId,
                    forecast_period: alloc.date,
                    quantity: alloc.quantity,
                    target_lot_index: target.index,
                    coa_issue_date: dest.coaIssueDate || null,
                    comment: dest.commentByDate?.[alloc.date] || null,
                    manual_shipment_date: dest.manualShipmentDateByDate?.[alloc.date] || null,
                  });
                }
              });
            });

            if (transfers.length === 0) {
              toast.error("割り当てがないためスマート分割できません");
              return;
            }

            await onSmartSplitConfirm(selectedLotForSmartSplit.lotId, transfers, splitCount);
          }}
          isLoading={isSmartSplitPending}
        />
      )}

      {/* 入庫数更新ダイアログ */}
      {selectedLotForQuantityUpdate && (
        <LotQuantityUpdateDialog
          open={quantityUpdateDialogOpen}
          onOpenChange={setQuantityUpdateDialogOpen}
          lotNumber={selectedLotForQuantityUpdate.lotNumber}
          currentQuantity={selectedLotForQuantityUpdate.currentQuantity}
          onConfirm={async (newQuantity, reason) => {
            await onQuantityUpdateConfirm(selectedLotForQuantityUpdate.lotId, newQuantity, reason);
          }}
          isLoading={isQuantityUpdatePending}
        />
      )}

      {/* 納入先追加ダイアログ */}
      {customerItem && (
        <AddDestinationDialog
          open={selectedLotIdForAddDest !== null}
          onOpenChange={(open: boolean) => !open && setSelectedLotIdForAddDest(null)}
          onConfirm={onAddDestinationConfirm}
          customerId={customerItem.customer_id}
          customerName={customerItem.customer_name}
        />
      )}
    </>
  );
}
