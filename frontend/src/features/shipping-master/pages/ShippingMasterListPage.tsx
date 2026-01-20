/**
 * 出荷用マスタデータ一覧ページ
 */

import { useQuery } from "@tanstack/react-query";
import { Plus, Download } from "lucide-react";
import { useState } from "react";

import { shippingMasterApi } from "../api";
import { ShippingMasterFilters } from "../components/ShippingMasterFilters";
import { ShippingMasterImportDialog } from "../components/ShippingMasterImportDialog";
import { ShippingMasterTable } from "../components/ShippingMasterTable";

import { Button, Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function ShippingMasterListPage() {
  const [customerCode, setCustomerCode] = useState("");
  const [materialCode, setMaterialCode] = useState("");
  const [jikuCode, setJikuCode] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["shipping-masters", { customerCode, materialCode, jikuCode }],
    queryFn: () =>
      shippingMasterApi.list({
        customer_code: customerCode || undefined,
        material_code: materialCode || undefined,
        jiku_code: jikuCode || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="出荷用マスタデータ" subtitle="OCR受注登録で使用する出荷ルールを管理" />

      <ShippingMasterFilters
        customerCode={customerCode}
        materialCode={materialCode}
        jikuCode={jikuCode}
        onCustomerCodeChange={setCustomerCode}
        onMaterialCodeChange={setMaterialCode}
        onJikuCodeChange={setJikuCode}
      />

      {/* アクション */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{data && `${data.total}件のデータ`}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Excelエクスポート
          </Button>
          <ShippingMasterImportDialog />
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <Card>
        <CardContent className="p-0">
          <ShippingMasterTable items={data?.items || []} isLoading={isLoading} error={error} />
        </CardContent>
      </Card>
    </div>
  );
}
