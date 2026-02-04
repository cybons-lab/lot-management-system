import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Plus, StickyNote } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { LotSection } from "./LotSection";
import { ProductHeader } from "./ProductHeader";
import {
  AddDestinationDialog,
  type NewDestinationFormData,
} from "./subcomponents/AddDestinationDialog";
import { useExcelViewData } from "./useExcelViewData";

import { Button } from "@/components/ui/button";
import { useUpdateAllocationSuggestionsBatch } from "@/features/allocations/hooks/api/useAllocationSuggestions";
import { SupplierFilterSet } from "@/features/assignments/components";
import {
  createDeliverySetting,
  updateDeliverySetting,
} from "@/features/customer-items/delivery-settings/api";
import { createDeliveryPlace } from "@/features/delivery-places/api";
import { QuickLotIntakeDialog } from "@/features/inventory/components/QuickLotIntakeDialog";
import { inventoryItemKeys } from "@/features/inventory/hooks";
import { useDeleteLot } from "@/hooks/mutations";
import { archiveLot } from "@/services/api/lot-service";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

interface LoadingOrErrorProps {
  isLoading: boolean;
}

function LoadingOrError({ isLoading }: LoadingOrErrorProps) {
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

/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
/* eslint-disable max-lines */
export function ExcelViewPage() {
  const { productId, customerItemId } = useParams<{
    productId: string;
    customerItemId?: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedLotIdForAddDest, setSelectedLotIdForAddDest] = useState<number | null>(null);
  const [addedDates, setAddedDates] = useState<string[]>([]);
  const [isLotIntakeDialogOpen, setIsLotIntakeDialogOpen] = useState(false);
  // Phase 9: Page-level notes state
  const [pageNotesExpanded, setPageNotesExpanded] = useState(false);
  const [localPageNotes, setLocalPageNotes] = useState("");

  const { data, isLoading, supplierId, customerItem } = useExcelViewData(
    Number(productId),
    customerItemId ? Number(customerItemId) : undefined,
  );

  // Phase 9: Sync local page notes with data
  useEffect(() => {
    if (data?.pageNotes !== undefined) {
      setLocalPageNotes(data.pageNotes || "");
      // Expand if notes exist
      if (data.pageNotes) {
        setPageNotesExpanded(true);
      }
    }
  }, [data?.pageNotes]);

  const updateMutation = useUpdateAllocationSuggestionsBatch();
  const deleteLotMutation = useDeleteLot({
    onSuccess: () => {
      toast.success("ロットを削除しました");
    },
  });
  const archiveMutation = useMutation({
    mutationFn: ({ id, lotNumber }: { id: number; lotNumber?: string }) =>
      archiveLot(id, lotNumber),
    onSuccess: () => {
      toast.success("ロットをアーカイブしました");
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: inventoryItemKeys.all });
      queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"] });
    },
    onError: (error: unknown) => {
      void (async () => {
        const message = await getUserFriendlyMessageAsync(error);
        toast.error(`ロットのアーカイブに失敗しました: ${message}`);
      })();
    },
  });

  const handleQtyChange = useCallback(
    async (lotId: number, dpId: number, date: string, value: number) => {
      const lot = data?.lots.find((l) => l.lotId === lotId);
      const dest = lot?.destinations.find((d) => d.deliveryPlaceId === dpId);

      if (!lot || !dest) {
        return;
      }

      try {
        await updateMutation.mutateAsync({
          updates: [
            {
              lot_id: lotId,
              delivery_place_id: dpId,
              supplier_item_id: Number(productId),
              customer_id: dest.customerId,
              forecast_period: date,
              quantity: value,
              coa_issue_date: dest.coaIssueDate || null,
            },
          ],
        });
        toast.success("数量を保存しました");
      } catch {
        toast.error("数量の保存に失敗しました");
      }
    },
    [data, productId, updateMutation],
  );

  const handleCoaDateChange = useCallback(
    async (lotId: number, dpId: number, date: string, coaDate: string | null) => {
      const lot = data?.lots.find((l) => l.lotId === lotId);
      const dest = lot?.destinations.find((d) => d.deliveryPlaceId === dpId);
      if (!lot || !dest) return;

      try {
        await updateMutation.mutateAsync({
          updates: [
            {
              lot_id: lotId,
              delivery_place_id: dpId,
              supplier_item_id: Number(productId),
              customer_id: dest.customerId,
              forecast_period: date,
              quantity: dest.shipmentQtyByDate[date] || 0,
              coa_issue_date: coaDate,
            },
          ],
        });
        toast.success("成績書日付を保存しました");
      } catch {
        toast.error("成績書日付の保存に失敗しました");
      }
    },
    [data, productId, updateMutation],
  );

  const handleLotFieldChange = useCallback(async (lotId: number, field: string, value: string) => {
    const { updateLot } = await import("@/services/api/lot-service");
    try {
      await updateLot(lotId, { [field]: value });
      toast.success("ロット情報を更新しました");
    } catch {
      toast.error("ロット情報の更新に失敗しました");
    }
  }, []);

  // Phase 9: Page notes save handler
  const handlePageNotesBlur = useCallback(async () => {
    if (!data?.deliverySettingId) {
      toast.error("納入先設定IDが見つかりません");
      return;
    }

    const currentNotes = data.pageNotes || "";
    if (localPageNotes === currentNotes) {
      return; // No change
    }

    try {
      await updateDeliverySetting(data.deliverySettingId, {
        notes: localPageNotes || null,
      });
      toast.success("ページメモを保存しました");
      // Invalidate queries to reflect the change
      queryClient.invalidateQueries({ queryKey: ["customer-item-delivery-settings"] });
    } catch {
      toast.error("ページメモの保存に失敗しました");
    }
  }, [data?.deliverySettingId, data?.pageNotes, localPageNotes, queryClient]);

  // Phase 9.2: Cell-level comment handler
  const handleCommentChange = useCallback(
    async (lotId: number, dpId: number, date: string, comment: string | null) => {
      const lot = data?.lots.find((l) => l.lotId === lotId);
      const dest = lot?.destinations.find((d) => d.deliveryPlaceId === dpId);
      if (!lot || !dest) return;

      try {
        await updateMutation.mutateAsync({
          updates: [
            {
              lot_id: lotId,
              delivery_place_id: dpId,
              supplier_item_id: Number(productId),
              customer_id: dest.customerId,
              forecast_period: date,
              quantity: dest.shipmentQtyByDate[date] || 0,
              coa_issue_date: dest.coaIssueDate || null,
              comment: comment,
            },
          ],
        });
        toast.success("コメントを保存しました");
        // Invalidate all allocationSuggestions queries (including those with params)
        await queryClient.invalidateQueries({
          queryKey: ["allocationSuggestions"],
          refetchType: "all",
        });
      } catch {
        toast.error("コメントの保存に失敗しました");
      }
    },
    [data, productId, updateMutation, queryClient],
  );

  // Phase 9.3: Manual shipment date handler
  const handleManualShipmentDateChange = useCallback(
    async (lotId: number, dpId: number, date: string, shipmentDate: string | null) => {
      const lot = data?.lots.find((l) => l.lotId === lotId);
      const dest = lot?.destinations.find((d) => d.deliveryPlaceId === dpId);
      if (!lot || !dest) return;

      try {
        await updateMutation.mutateAsync({
          updates: [
            {
              lot_id: lotId,
              delivery_place_id: dpId,
              supplier_item_id: Number(productId),
              customer_id: dest.customerId,
              forecast_period: date,
              quantity: dest.shipmentQtyByDate[date] || 0,
              coa_issue_date: dest.coaIssueDate || null,
              comment: dest.commentByDate?.[date] || null,
              manual_shipment_date: shipmentDate,
            },
          ],
        });
        toast.success("出荷日を保存しました");
        // Invalidate all allocationSuggestions queries (including those with params)
        await queryClient.invalidateQueries({
          queryKey: ["allocationSuggestions"],
          refetchType: "all",
        });
      } catch {
        toast.error("出荷日の保存に失敗しました");
      }
    },
    [data, productId, updateMutation, queryClient],
  );

  const allDateColumns = useMemo(() => {
    const base = data?.dateColumns || [];
    return Array.from(new Set([...base, ...addedDates])).sort();
  }, [data?.dateColumns, addedDates]);

  const handleAddNewColumn = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    setAddedDates((prev) => [...prev, dateStr]);
  };

  const handleEditLot = useCallback((lotId: number) => {
    // TODO: Open edit dialog for lot
    toast.info(`ロット ${lotId} の編集機能は今後実装予定です`);
  }, []);

  const handleDeleteLot = useCallback(
    async (lotId: number) => {
      await deleteLotMutation.mutateAsync(lotId);
    },
    [deleteLotMutation],
  );

  const handleArchiveLot = useCallback(
    async (lotId: number, lotNumber?: string) => {
      await archiveMutation.mutateAsync({ id: lotId, lotNumber });
    },
    [archiveMutation],
  );

  const handleAddDestination = useCallback((lotId: number) => {
    setSelectedLotIdForAddDest(lotId);
  }, []);

  const handleConfirmAddDestination = useCallback(
    async (formData: NewDestinationFormData) => {
      if (!selectedLotIdForAddDest || !customerItem || !data) {
        toast.error("必要なデータが不足しています");
        return;
      }

      const firstDate = allDateColumns[0];
      if (!firstDate) {
        toast.error("日付列がありません。先に日付列を追加してください。");
        setSelectedLotIdForAddDest(null);
        return;
      }

      try {
        // 1. 新しい納入先（delivery_place）を作成
        const newDeliveryPlace = await createDeliveryPlace({
          customer_id: customerItem.customer_id,
          jiku_code: formData.jiku_code,
          delivery_place_name: formData.delivery_place_name,
          delivery_place_code: formData.delivery_place_code,
        });

        // 2. 納入先別設定（delivery_setting）を作成
        try {
          await createDeliverySetting({
            customer_item_id: customerItem.id,
            delivery_place_id: newDeliveryPlace.id,
            is_default: false,
            jiku_code: formData.jiku_code,
          });
        } catch (e: unknown) {
          const is409 =
            e instanceof Object &&
            "response" in e &&
            (e.response as { status?: number })?.status === 409;

          if (is409) {
            console.debug("[ExcelView] Delivery setting already exists (409), continuing", {
              customer_item_id: customerItem.id,
              delivery_place_id: newDeliveryPlace.id,
            });
          } else {
            console.error("[ExcelView] Master sync failed, continuing anyway", {
              customer_item_id: customerItem.id,
              delivery_place_id: newDeliveryPlace.id,
              error: String(e).substring(0, 500),
            });
            toast.warning("マスタ同期に失敗しましたが、引当レコードは作成されます");
          }
        }

        // 3. 引当レコード（提案）の作成
        await updateMutation.mutateAsync({
          updates: [
            {
              lot_id: selectedLotIdForAddDest,
              delivery_place_id: newDeliveryPlace.id,
              supplier_item_id: Number(productId),
              customer_id: customerItem.customer_id,
              forecast_period: firstDate,
              quantity: 0, // Initial quantity 0 to persist mapping
            },
          ],
        });

        // 4. すべての関連キャッシュを無効化
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"] }),
          queryClient.invalidateQueries({ queryKey: ["customer-item-delivery-settings"] }),
          queryClient.invalidateQueries({ queryKey: ["delivery-places"] }),
          queryClient.invalidateQueries({ queryKey: ["inventoryItems"] }),
        ]);

        toast.success("納入先を追加しました");
      } catch {
        toast.error("納入先の追加に失敗しました");
      }

      setSelectedLotIdForAddDest(null);
    },
    [
      selectedLotIdForAddDest,
      allDateColumns,
      customerItem,
      productId,
      updateMutation,
      queryClient,
      data,
    ],
  );

  if (isLoading || !data) return <LoadingOrError isLoading={isLoading} />;

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">引当Excel表示</h1>
            <p className="text-slate-500 text-sm">
              {data.header.supplierName} - {data.header.productName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/reports/monthly")}
            title="月次レポートを表示"
          >
            <BarChart3 className="h-4 w-4" />
            月次レポート
          </Button>
          <Button className="gap-2" onClick={() => setIsLotIntakeDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            新規ロット受入
          </Button>
        </div>
      </div>
      {/* 納入先追加ダイアログ */}
      {customerItem && (
        <AddDestinationDialog
          open={selectedLotIdForAddDest !== null}
          onOpenChange={(open) => !open && setSelectedLotIdForAddDest(null)}
          onConfirm={handleConfirmAddDestination}
          customerId={customerItem.customer_id}
          customerName={customerItem.customer_name}
        />
      )}

      {/* 担当仕入先関連の警告 */}
      <SupplierFilterSet warningOnly warningClassName="mb-4" />

      <div className="space-y-4">
        <ProductHeader data={data.header} involvedDestinations={data.involvedDestinations} />

        {/* Phase 9: Page-level notes */}
        {customerItemId && (
          <div className="border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden">
            <button
              type="button"
              className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-blue-50/50 transition-colors"
              onClick={() => setPageNotesExpanded(!pageNotesExpanded)}
            >
              <StickyNote className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-slate-700">ページ全体のメモ</span>
              {data.pageNotes && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                  入力あり
                </span>
              )}
              <span className="ml-auto text-slate-400 text-sm">
                {pageNotesExpanded ? "▲" : "▼"}
              </span>
            </button>
            {pageNotesExpanded && (
              <div className="px-4 pb-4">
                <textarea
                  className="w-full min-h-[100px] p-3 border border-blue-200 rounded bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="このページ全体に関するメモを入力..."
                  value={localPageNotes}
                  onChange={(e) => setLocalPageNotes(e.target.value)}
                  onBlur={handlePageNotesBlur}
                />
                <p className="mt-2 text-xs text-slate-500">
                  メーカー品番 × 先方品番 × 納入先に紐付くメモです
                </p>
              </div>
            )}
          </div>
        )}

        {data.lots.map((lot) => {
          return (
            <LotSection
              key={lot.lotId}
              lot={lot}
              dateColumns={allDateColumns}
              isEditing={true} // Always editable in auto-save mode
              onQtyChange={handleQtyChange}
              onLotFieldChange={handleLotFieldChange}
              onCoaDateChange={(
                lotId: number,
                dpId: number,
                date: string,
                coaDate: string | null,
              ) => handleCoaDateChange(lotId, dpId, date, coaDate)}
              onAddColumn={handleAddNewColumn}
              onAddDestination={handleAddDestination}
              onEdit={handleEditLot}
              onDelete={handleDeleteLot}
              onArchive={handleArchiveLot}
              isArchiving={archiveMutation.isPending}
              onCommentChange={handleCommentChange}
              onManualShipmentDateChange={handleManualShipmentDateChange}
            />
          );
        })}
      </div>

      {/* New Lot Intake Button */}
      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          size="lg"
          className="gap-3 border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 h-16 px-8"
          onClick={() => setIsLotIntakeDialogOpen(true)}
        >
          <Plus className="h-6 w-6" />
          <span className="text-lg font-medium">新規ロット入庫</span>
        </Button>
      </div>

      <QuickLotIntakeDialog
        open={isLotIntakeDialogOpen}
        onOpenChange={setIsLotIntakeDialogOpen}
        initialProductId={Number(productId)}
        initialSupplierId={supplierId}
      />
    </PageContainer>
  );
}
