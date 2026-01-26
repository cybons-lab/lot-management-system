import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { LotSection } from "./LotSection";
import { generateMockData } from "./mockData";
import { ProductHeader } from "./ProductHeader";

import { Button } from "@/components/ui";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function ExcelViewPage() {
  const navigate = useNavigate();
  const data = generateMockData();

  return (
    <PageContainer>
      <PageHeader
        title="ロット管理（Excelビュー）"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/inventory")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              一覧に戻る
            </Button>
            <Button size="sm">
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </div>
        }
      />

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
