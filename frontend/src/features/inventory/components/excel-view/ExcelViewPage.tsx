import { ArrowLeft, Save } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

import { LotSection } from "./LotSection";
import { ProductHeader } from "./ProductHeader";
import { useExcelViewData } from "./useExcelViewData";

import { Button } from "@/components/ui";
import { PageContainer } from "@/shared/components/layout/PageContainer";

export function ExcelViewPage() {
  const { productId, warehouseId } = useParams<{ productId: string; warehouseId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useExcelViewData(Number(productId), Number(warehouseId));

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500 animate-pulse font-medium">データを読み込み中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-red-500 font-medium">品目情報の取得に失敗しました。</div>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">材料ロット管理（個別）</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            保存
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <ProductHeader data={data.header} />

        <div className="overflow-hidden border border-slate-300 rounded-lg">
          <div className="p-4 bg-white overflow-auto max-h-[80vh]">
            {data.lots.map((lot, idx) => (
              <LotSection key={idx} lot={lot} dateColumns={data.dateColumns} />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
