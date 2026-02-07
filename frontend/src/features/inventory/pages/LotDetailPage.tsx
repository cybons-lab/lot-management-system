/**
 * LotDetailPage - ロット詳細
 */

import { format } from "date-fns";
import { ArrowLeft, ArrowUpFromLine } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { IntakeHistoryList } from "@/features/intake-history/components/IntakeHistoryList";
import { WithdrawalHistoryList } from "@/features/withdrawals/components";
import { useLot } from "@/hooks/api";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
import { PageHeader } from "@/shared/components/layout";
import { fmt } from "@/shared/utils/number";
import { getLotStatuses } from "@/shared/utils/status";

type LotData = NonNullable<ReturnType<typeof useLot>["data"]>;

/* eslint-disable complexity -- 業務分岐を明示的に維持するため */
function LotBasicInfo({ lot }: { lot: LotData }) {
  const statuses = getLotStatuses(lot);

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">基本情報</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium text-gray-500">ロット番号</div>
          <div className="mt-1 font-mono text-lg font-medium">{lot.lot_number}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">ステータス</div>
          <div className="mt-1 flex items-center gap-1">
            {statuses.map((s) => (
              <LotStatusIcon key={s} status={s} />
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">製品</div>
          <div className="mt-1">{lot.product_name || "名称未設定"}</div>
          <div className="mt-0.5 text-xs text-gray-500">
            メーカー品番: {lot.product_code || "-"}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">倉庫</div>
          <div className="mt-1">
            {lot.warehouse_name || "名称未設定"}
            <span className="ml-2 text-sm text-gray-500">({lot.warehouse_code || "-"})</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">仕入先</div>
          <div className="mt-1">
            {lot.supplier_name || "-"}
            {lot.supplier_code && (
              <span className="ml-2 text-sm text-gray-500">({lot.supplier_code})</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">単位</div>
          <div className="mt-1">{lot.unit}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">入荷日</div>
          <div className="mt-1">
            {lot.received_date ? format(new Date(lot.received_date), "yyyy/MM/dd") : "-"}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">有効期限</div>
          <div className="mt-1">
            {lot.expiry_date ? format(new Date(lot.expiry_date), "yyyy/MM/dd") : "-"}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">検査ステータス</div>
          <div className="mt-1">{lot.inspection_status ?? "-"}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">検査日</div>
          <div className="mt-1">
            {lot.inspection_date ? format(new Date(lot.inspection_date), "yyyy/MM/dd") : "-"}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">成績書番号</div>
          <div className="mt-1">{lot.inspection_cert_number ?? "-"}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">参照情報</div>
          <div className="mt-1">{lot.origin_reference ?? "-"}</div>
        </div>
      </div>
    </div>
  );
}

function LotQuantityInfo({ lot }: { lot: LotData }) {
  const available =
    Number(lot.current_quantity) - Number(lot.allocated_quantity) - Number(lot.locked_quantity);

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">在庫数</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="text-sm font-medium text-blue-700">現在在庫</div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{fmt(lot.current_quantity)}</div>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4">
          <div className="text-sm font-medium text-yellow-700">引当済</div>
          <div className="mt-2 text-2xl font-bold text-yellow-900">
            {fmt(lot.allocated_quantity)}
          </div>
        </div>
        <div className="rounded-lg bg-red-50 p-4">
          <div className="text-sm font-medium text-red-700">ロック済</div>
          <div className="mt-2 text-2xl font-bold text-red-900">{fmt(lot.locked_quantity)}</div>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <div className="text-sm font-medium text-green-700">利用可能</div>
          <div className="mt-2 text-2xl font-bold text-green-900">{fmt(available)}</div>
        </div>
      </div>
    </div>
  );
}

export function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();
  const lotIdNum = lotId ? Number(lotId) : 0;

  const { data: lot, isLoading, isError } = useLot(lotIdNum);

  const handleBack = () => {
    navigate("/inventory");
  };

  const handleWithdraw = () => {
    navigate(`/inventory/withdrawals/new?lotId=${lotId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (isError || !lot) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-lg text-gray-500">ロットが見つかりませんでした</p>
          <Button onClick={handleBack} className="mt-4">
            戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          在庫管理
        </Button>
        <PageHeader
          title="ロット詳細"
          {...(lot.lot_number ? { subtitle: lot.lot_number } : {})}
          actions={
            <Button variant="outline" onClick={handleWithdraw}>
              <ArrowUpFromLine className="mr-2 h-4 w-4" />
              出庫
            </Button>
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">サマリ</TabsTrigger>
          <TabsTrigger value="intake_history">入庫履歴</TabsTrigger>
          <TabsTrigger value="withdrawal_history">出庫履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <LotBasicInfo lot={lot} />
          <LotQuantityInfo lot={lot} />
        </TabsContent>

        <TabsContent value="intake_history" className="space-y-4">
          <IntakeHistoryList productId={lot.supplier_item_id} warehouseId={lot.warehouse_id} />
        </TabsContent>

        <TabsContent value="withdrawal_history" className="space-y-4">
          <WithdrawalHistoryList productId={lot.supplier_item_id} warehouseId={lot.warehouse_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
