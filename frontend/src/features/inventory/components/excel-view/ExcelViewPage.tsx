import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { LotSection } from "./LotSection";
import { ProductHeader } from "./ProductHeader";
import { AddDestinationDialog } from "./subcomponents/AddDestinationDialog";
import { useExcelViewData } from "./useExcelViewData";

import { Button } from "@/components/ui/button";
import { useUpdateAllocationSuggestionsBatch } from "@/features/allocations/hooks/api/useAllocationSuggestions";
import { SupplierFilterSet } from "@/features/assignments/components";
import { getCustomerItems, type CustomerItem } from "@/features/customer-items/api";
import { createDeliverySetting } from "@/features/customer-items/delivery-settings/api";
import type { DeliveryPlace } from "@/features/delivery-places/api";
import { useDeliveryPlaces } from "@/features/delivery-places/hooks/useDeliveryPlaces";
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

  const { data, isLoading, supplierId } = useExcelViewData(
    Number(productId),
    customerItemId ? Number(customerItemId) : undefined,
  );

  const { data: deliveryPlacesResponse } = useDeliveryPlaces();
  const deliveryPlaces = useMemo(() => {
    // API response might be { items: T[] } or T[] (depending on how useMasterApi is used)
    const items =
      (deliveryPlacesResponse as { items?: DeliveryPlace[] })?.items ||
      (Array.isArray(deliveryPlacesResponse) ? deliveryPlacesResponse : []);
    return items;
  }, [deliveryPlacesResponse]);

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
    async (deliveryPlaceId: number) => {
      if (!selectedLotIdForAddDest) return;

      const firstDate = allDateColumns[0];
      if (!firstDate) {
        setSelectedLotIdForAddDest(null);
        return;
      }

      const dp = deliveryPlaces.find((d: { id: number }) => d.id === deliveryPlaceId);

      try {
        // 1. マスタデータ（納入先別設定）への反映を試みる
        // プロダクトに関連するすべての得意先品番を取得
        const customerItems = await getCustomerItems({ supplier_item_id: Number(productId) });
        const targetCI = (customerItems as CustomerItem[]).find(
          (ci: CustomerItem) => ci.customer_id === dp?.customer_id,
        );

        if (targetCI) {
          try {
            await createDeliverySetting({
              customer_item_id: targetCI.id,
              delivery_place_id: deliveryPlaceId,
              is_default: false,
            });
            // 既に存在する場合はエラー(409)になる可能性があるが、その場合は実質成功（追加済み）として扱う
          } catch (e: unknown) {
            if (
              e instanceof Object &&
              "response" in e &&
              (e.response as { status?: number })?.status !== 409
            ) {
              console.error("Master sync failed:", e);
              // マスタ同期に失敗しても引当レコードの作成は続行する
            }
          }
        }

        // 2. 引当レコード（提案）の作成
        await updateMutation.mutateAsync({
          updates: [
            {
              lot_id: selectedLotIdForAddDest,
              delivery_place_id: deliveryPlaceId,
              supplier_item_id: Number(productId),
              customer_id: dp?.customer_id || 0,
              forecast_period: firstDate,
              quantity: 0, // Initial quantity 0 to persist mapping
            },
          ],
        });
        toast.success("納入先を追加しました");
      } catch {
        toast.error("納入先の追加に失敗しました");
      }

      setSelectedLotIdForAddDest(null);
    },
    [selectedLotIdForAddDest, allDateColumns, deliveryPlaces, productId, updateMutation],
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
          {/* Action buttons removed for auto-save UI */}
          <Button className="gap-2" onClick={() => setIsLotIntakeDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            新規ロット受入
          </Button>
        </div>
      </div>
      {/* 納入先追加ダイアログ */}
      <AddDestinationDialog
        open={selectedLotIdForAddDest !== null}
        onOpenChange={(open) => !open && setSelectedLotIdForAddDest(null)}
        onConfirm={handleConfirmAddDestination}
        existingDestinationIds={
          selectedLotIdForAddDest
            ? data?.lots
                .find((lot) => lot.lotId === selectedLotIdForAddDest)
                ?.destinations.map((d) => d.deliveryPlaceId)
            : []
        }
      />

      {/* 担当仕入先関連の警告 */}
      <SupplierFilterSet warningOnly warningClassName="mb-4" />

      <div className="space-y-4">
        <ProductHeader data={data.header} involvedDestinations={data.involvedDestinations} />
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
