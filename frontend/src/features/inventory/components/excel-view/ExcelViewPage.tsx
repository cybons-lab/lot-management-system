import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";

import { ExcelViewDialogs } from "./components/ExcelViewDialogs";
import { ExcelViewHeader } from "./components/ExcelViewHeader";
import { useExcelView } from "./hooks/useExcelView";
import { LotSection } from "./LotSection";
import { ProductHeader } from "./ProductHeader";

import { Button } from "@/components/ui/button";
import { SupplierFilterSet } from "@/features/assignments/components";
import { PageNotes } from "@/shared/components/data/PageNotes";
import { PageContainer } from "@/shared/components/layout/PageContainer";

/**
 * データの読み込み中またはエラー時の表示用コンポーネント
 */
function LoadingOrError({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div
        className={
          isLoading ? "text-slate-500 animate-pulse font-medium" : "text-red-500 font-medium"
        }
      >
        {isLoading ? "データを読み込み中..." : "品目情報の取得に失敗しました。"}
      </div>
    </div>
  );
}

/**
 * 在庫引当Excel表示ページ
 *
 * リファクタリング履歴:
 * - Phase 1: PageNotes 統合
 * - Phase 3: ロジックの抽出 (useExcelView), コンポーネント分割 (Header, Dialogs, Utils)
 */
// eslint-disable-next-line max-lines-per-function -- 在庫引当Excel表示ページのロジックを1箇所で管理するため
export function ExcelViewPage() {
  const { productId, customerItemId } = useParams<{
    productId: string;
    customerItemId?: string;
  }>();

  const p = useExcelView(Number(productId), customerItemId ? Number(customerItemId) : undefined);

  if (p.isLoading || !p.data) {
    return <LoadingOrError isLoading={p.isLoading} />;
  }

  return (
    <PageContainer>
      <ExcelViewHeader
        supplierName={p.data.header.supplierName}
        productName={p.data.header.productName}
        onIntakeClick={() => p.setIsLotIntakeDialogOpen(true)}
      />

      <SupplierFilterSet warningOnly warningClassName="mb-4" />

      <div className="space-y-4">
        <ProductHeader data={p.data.header} involvedDestinations={p.orderedInvolvedDestinations} />

        {customerItemId && p.data && (
          <PageNotes
            value={p.data.pageNotes || ""}
            defaultExpanded={!!p.data.pageNotes}
            description="メーカー品番 × 先方品番 × 納入先に紐付くメモです"
            onSave={p.handleSaveNotes}
          />
        )}

        {p.orderedLots.map((lot) => (
          <LotSection
            key={lot.lotId}
            lot={lot}
            dateColumns={p.allDateColumns}
            isEditing={true}
            onQtyChange={p.handleQtyChange}
            onLotFieldChange={p.handleLotFieldChange}
            onCoaDateChange={p.handleCoaDateChange}
            onAddColumn={p.handleAddNewColumn}
            onAddDestination={p.setSelectedLotIdForAddDest}
            onEdit={(lotId) => console.debug("Edit lot", lotId)}
            onDelete={p.handleDeleteLot}
            onArchive={p.handleArchiveLot}
            isArchiving={p.isArchivePending}
            onCommentChange={p.handleCommentChange}
            onManualShipmentDateChange={p.handleManualShipmentDateChange}
            onSplitLot={p.handleSmartSplitLot}
            onUpdateQuantity={p.handleUpdateQuantity}
            onReorderDestination={p.handleReorderDestination}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          size="lg"
          className="gap-3 border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 h-16 px-8"
          onClick={() => p.setIsLotIntakeDialogOpen(true)}
        >
          <Plus className="h-6 w-6" />
          <span className="text-lg font-medium">新規ロット入庫</span>
        </Button>
      </div>

      <ExcelViewDialogs
        productId={Number(productId)}
        {...(p.supplierId !== undefined ? { supplierId: p.supplierId } : {})}
        {...(p.customerItem !== undefined ? { customerItem: p.customerItem } : {})}
        data={p.data}
        isLotIntakeDialogOpen={p.isLotIntakeDialogOpen}
        setIsLotIntakeDialogOpen={p.setIsLotIntakeDialogOpen}
        selectedLotForSmartSplit={p.selectedLotForSmartSplit}
        smartSplitDialogOpen={p.smartSplitDialogOpen}
        setSmartSplitDialogOpen={p.setSmartSplitDialogOpen}
        onSmartSplitConfirm={p.handleConfirmSmartSplit}
        isSmartSplitPending={p.isSmartSplitPending}
        selectedLotForQuantityUpdate={p.selectedLotForQuantityUpdate}
        quantityUpdateDialogOpen={p.quantityUpdateDialogOpen}
        setQuantityUpdateDialogOpen={p.setQuantityUpdateDialogOpen}
        onQuantityUpdateConfirm={p.handleConfirmQuantityUpdate}
        isQuantityUpdatePending={p.isQuantityUpdatePending}
        selectedLotIdForAddDest={p.selectedLotIdForAddDest}
        setSelectedLotIdForAddDest={p.setSelectedLotIdForAddDest}
        onAddDestinationConfirm={p.handleConfirmAddDestination}
      />
    </PageContainer>
  );
}
