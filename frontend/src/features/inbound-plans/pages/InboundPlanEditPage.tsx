/**
 * InboundPlanEditPage - 入荷予定編集
 * Skeleton implementation
 */

import { useParams } from "react-router-dom";

import { Button } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";

export function InboundPlanEditPage() {
  const { planId } = useParams<{ planId: string }>();

  return (
    <PageContainer>
      <PageHeader
        title="入荷予定編集"
        subtitle={`ID: ${planId}`}
        actions={
          <div className="space-x-2">
            <Button variant="outline">キャンセル</Button>
            <Button>保存</Button>
          </div>
        }
        className="pb-0"
      />

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          入荷予定編集フォーム、明細編集テーブルを実装予定
        </p>
      </div>
    </PageContainer>
  );
}
