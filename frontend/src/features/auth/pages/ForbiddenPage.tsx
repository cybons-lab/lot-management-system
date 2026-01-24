import { Link, useLocation, type Location } from "react-router-dom";

import { Button } from "@/components/ui";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function ForbiddenPage() {
  const location = useLocation();
  const fromPath = (location.state as { from?: Location })?.from?.pathname;

  return (
    <PageContainer>
      <PageHeader title="アクセス権限がありません" />
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          このページまたは操作に必要な権限がありません。必要な権限が付与されているか確認するか、
          管理者にお問い合わせください。
        </p>
        {fromPath && <p className="text-xs text-slate-500">直前のページ: {fromPath}</p>}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">ダッシュボードへ戻る</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/login">ログイン画面へ</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
