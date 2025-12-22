/**
 * ForecastCreatePage - フォーキャスト新規作成
 * Skeleton implementation
 */

import { Button } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";

export function ForecastCreatePage() {
  return (
    <PageContainer>
      <PageHeader
        title="フォーキャスト作成"
        subtitle="新規フォーキャストの登録"
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
        <p className="mt-2 text-sm text-gray-400">ヘッダ入力フォーム、明細入力テーブルを実装予定</p>
      </div>
    </PageContainer>
  );
}
