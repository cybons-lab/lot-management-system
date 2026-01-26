import { ArrowLeft, Save, Edit3, X } from "lucide-react";
import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { LotSection } from "./LotSection";
import { ProductHeader } from "./ProductHeader";
import { useExcelViewData } from "./useExcelViewData";

import { Button } from "@/components/ui";
import { useUpdateAllocationSuggestionsBatch } from "@/features/allocations/hooks/api/useAllocationSuggestions";
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

export function ExcelViewPage() {
  const { productId, warehouseId } = useParams<{ productId: string; warehouseId: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [localChanges, setLocalChanges] = useState<Record<string, number>>({});
  const { data, isLoading } = useExcelViewData(Number(productId), Number(warehouseId));
  const updateMutation = useUpdateAllocationSuggestionsBatch();

  const handleQtyChange = useCallback(
    (lotId: number, dpId: number, date: string, value: number) => {
      setLocalChanges((prev) => ({ ...prev, [`${lotId}:${dpId}:${date}`]: value }));
    },
    [],
  );

  const handleSave = async () => {
    if (Object.keys(localChanges).length === 0) return setIsEditing(false);
    const updates = Object.entries(localChanges).map(([key, quantity]) => {
      const [lotId, dpId, forecastPeriod] = key.split(":");
      const lot = data?.lots.find((l) => l.lotId === Number(lotId));
      const dest = lot?.destinations.find((d) => d.deliveryPlaceId === Number(dpId));
      return {
        lot_id: Number(lotId),
        delivery_place_id: Number(dpId),
        product_id: Number(productId),
        customer_id: dest?.customerId || 0,
        forecast_period: forecastPeriod,
        quantity,
      };
    });
    try {
      await updateMutation.mutateAsync({ updates });
      toast.success("計画引当を保存しました");
      setLocalChanges({});
      setIsEditing(false);
    } catch {
      toast.error("保存に失敗しました");
    }
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
            onCancel={() => setIsEditing(false)}
            onSave={handleSave}
          />
        </div>
      </div>
      <div className="space-y-4">
        <ProductHeader data={data.header} />
        {data.lots.map((lot) => (
          <LotSection
            key={lot.lotId}
            lot={lot}
            dateColumns={data.dateColumns}
            isEditing={isEditing}
            localChanges={localChanges}
            onQtyChange={handleQtyChange}
          />
        ))}
      </div>
    </PageContainer>
  );
}
