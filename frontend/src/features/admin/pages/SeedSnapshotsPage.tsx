/**
 * SeedSnapshotsPage - スナップショット管理
 * Skeleton implementation
 */

import { Button } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";

export function SeedSnapshotsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="スナップショット管理"
        subtitle="データベーススナップショットの作成・復元"
        actions={<Button>新規スナップショット作成</Button>}
        className="pb-0"
      />

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          スナップショット一覧、作成、復元、削除機能を実装予定
        </p>
      </div>
    </PageContainer>
  );
}
