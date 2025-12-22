/**
 * LotDetailPage - ロット詳細・編集
 * Skeleton implementation
 */

import { ArrowUpFromLine } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";

export function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();

  const handleWithdraw = () => {
    navigate(`/inventory/withdrawals/new?lotId=${lotId}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="ロット詳細"
        subtitle={`ロットID: ${lotId}`}
        actions={
          <div className="space-x-2">
            <Button variant="outline" onClick={handleWithdraw}>
              <ArrowUpFromLine className="mr-2 h-4 w-4" />
              出庫
            </Button>
            <Button variant="outline">編集</Button>
            <Button variant="destructive">削除</Button>
          </div>
        }
        className="pb-0"
      />

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          ロット基本情報、在庫変動履歴、引当状況を実装予定
        </p>
      </div>
    </PageContainer>
  );
}
