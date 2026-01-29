import { ArrowLeft, Edit3, Plus, Save, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { LotSection } from "./LotSection";
import { ProductHeader } from "./ProductHeader";
import { useExcelViewData } from "./useExcelViewData";

import { Button } from "@/components/ui";
import { useUpdateAllocationSuggestionsBatch } from "@/features/allocations/hooks/api/useAllocationSuggestions";
import { QuickLotIntakeDialog } from "@/features/inventory/components/QuickLotIntakeDialog";
import { PageContainer } from "@/shared/components/layout/PageContainer";

interface ActionButtonsProps {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

function ActionButtons({ isEditing, isSaving, onEdit, onCancel, onSave }: ActionButtonsProps) {
  if (isEditing) {
    return (
      <>
        <Button variant="outline" className="gap-2" onClick={onCancel}>
          <X className="h-4 w-4" />
          キャンセル
        </Button>
        <Button className="gap-2" onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </>
    );
  }
  return (
    <Button variant="outline" className="gap-2" onClick={onEdit}>
      <Edit3 className="h-4 w-4" />
      編集
    </Button>
  );
}

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
  const { productId, warehouseId, customerItemId } = useParams<{
    productId: string;
    warehouseId: string;
    customerItemId?: string;
  }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [localChanges, setLocalChanges] = useState<Record<string, number>>({});
  const [lotFieldChanges, setLotFieldChanges] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [addedDates, setAddedDates] = useState<string[]>([]);
  const [isLotIntakeDialogOpen, setIsLotIntakeDialogOpen] = useState(false);

  const { data, isLoading, supplierId } = useExcelViewData(
    Number(productId),
    Number(warehouseId),
    customerItemId ? Number(customerItemId) : undefined,
  );
  const updateMutation = useUpdateAllocationSuggestionsBatch();

  const handleQtyChange = useCallback(
    (lotId: number, dpId: number, date: string, value: number) => {
      setLocalChanges((prev) => ({ ...prev, [`${lotId}:${dpId}:${date}`]: value }));
    },
    [],
  );

  const handleLotFieldChange = useCallback((lotId: number, field: string, value: string) => {
    setLotFieldChanges((prev) => ({
      ...prev,
      [lotId]: {
        ...prev[lotId],
        [field]: value,
      },
    }));
  }, []);

  const validateLotFieldChanges = useCallback(() => {
    if (!data || Object.keys(lotFieldChanges).length === 0) return true;

    // Build a map of (lot_number, received_date) combinations
    const lotCombinations = new Map<string, number>();

    // Add existing lots (not being edited)
    data.lots.forEach((lot) => {
      if (!lotFieldChanges[lot.lotId]) {
        const lotNumber = lot.lotInfo.lotNo || "";
        const receivedDate = lot.lotInfo.inboundDate;
        const key = `${lotNumber}:${receivedDate}`;
        lotCombinations.set(key, lot.lotId);
      }
    });

    // Check edited lots for duplicates
    for (const [lotIdStr, fields] of Object.entries(lotFieldChanges)) {
      const lotId = Number(lotIdStr);
      const lot = data.lots.find((l) => l.lotId === lotId);
      if (!lot) continue;

      // Get the new values (or keep existing if not changed)
      const newLotNumber = fields.lot_number !== undefined ? fields.lot_number : lot.lotInfo.lotNo;
      const newReceivedDate =
        fields.received_date !== undefined ? fields.received_date : lot.lotInfo.inboundDate;

      const key = `${newLotNumber || ""}:${newReceivedDate}`;
      const existingLotId = lotCombinations.get(key);

      if (existingLotId !== undefined && existingLotId !== lotId) {
        toast.error(
          `ロット番号「${newLotNumber || "(空欄)"}」と入荷日「${newReceivedDate}」の組み合わせは既に存在します`,
        );
        return false;
      }

      lotCombinations.set(key, lotId);
    }

    return true;
  }, [data, lotFieldChanges]);

  const handleSave = async () => {
    const hasQuantityChanges = Object.keys(localChanges).length > 0;
    const hasLotFieldChanges = Object.keys(lotFieldChanges).length > 0;

    if (!hasQuantityChanges && !hasLotFieldChanges) {
      setIsEditing(false);
      return;
    }

    // Validate lot field changes for duplicates
    if (!validateLotFieldChanges()) return;

    try {
      // Save lot field changes first
      if (hasLotFieldChanges) {
        const { updateLot } = await import("@/services/api/lot-service");
        await Promise.all(
          Object.entries(lotFieldChanges).map(async ([lotIdStr, fields]) => {
            const lotId = Number(lotIdStr);
            await updateLot(lotId, fields);
          }),
        );
      }

      // Then save quantity changes
      if (hasQuantityChanges) {
        const updates = Object.entries(localChanges).map(([key, quantity]) => {
          const [lotId, dpId, forecastPeriod] = key.split(":");
          const lot = data?.lots.find((l) => l.lotId === Number(lotId));
          const dest = lot?.destinations.find((d) => d.deliveryPlaceId === Number(dpId));
          return {
            lot_id: Number(lotId),
            delivery_place_id: Number(dpId),
            product_group_id: Number(productId),
            customer_id: dest?.customerId || 0,
            forecast_period: forecastPeriod,
            quantity,
          };
        });
        await updateMutation.mutateAsync({ updates });
      }

      toast.success("変更を保存しました");
      setLocalChanges({});
      setLotFieldChanges({});
      setAddedDates([]);
      setIsEditing(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "保存に失敗しました";
      toast.error(errorMessage);
    }
  };

  const allDateColumns = useMemo(() => {
    const base = data?.dateColumns || [];
    return Array.from(new Set([...base, ...addedDates])).sort();
  }, [data?.dateColumns, addedDates]);

  const handleAddNewColumn = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    setAddedDates((prev) => [...prev, dateStr]);
    setIsEditing(true);
  };

  if (isLoading || !data) return <LoadingOrError isLoading={isLoading} />;

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">材料ロット管理（個別）</h1>
        </div>
        <div className="flex items-center gap-3">
          <ActionButtons
            isEditing={isEditing}
            isSaving={updateMutation.isPending}
            onEdit={() => setIsEditing(true)}
            onCancel={() => {
              setIsEditing(false);
              setLocalChanges({});
              setLotFieldChanges({});
              setAddedDates([]);
            }}
            onSave={handleSave}
          />
        </div>
      </div>
      <div className="space-y-4">
        <ProductHeader data={data.header} involvedDestinations={data.involvedDestinations} />
        {data.lots.map((lot) => (
          <LotSection
            key={lot.lotId}
            lot={lot}
            dateColumns={allDateColumns}
            isEditing={isEditing}
            localChanges={localChanges}
            onQtyChange={handleQtyChange}
            onLotFieldChange={handleLotFieldChange}
            onAddColumn={handleAddNewColumn}
          />
        ))}
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
        initialWarehouseId={Number(warehouseId)}
        initialSupplierId={supplierId}
      />
    </PageContainer>
  );
}
