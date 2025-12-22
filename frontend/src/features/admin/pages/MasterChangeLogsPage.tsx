/**
 * MasterChangeLogsPage - マスタ変更履歴
 * Skeleton implementation
 */

import { Button } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";

export function MasterChangeLogsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="マスタ変更履歴"
        subtitle="マスタデータの変更履歴と差分表示"
        actions={<Button variant="outline">CSV出力</Button>}
        className="pb-0"
      />

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          変更履歴一覧、フィルター、差分表示機能を実装予定
        </p>
      </div>
    </PageContainer>
  );
}
