import { Link, useLocation, type Location } from "react-router-dom";

import { Button } from "@/components/ui";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function ForbiddenPage() {
  const location = useLocation();
  const fromPath = (location.state as { from?: Location; isGuest?: boolean })?.from?.pathname;
  const isGuest = (location.state as { from?: Location; isGuest?: boolean })?.isGuest ?? false;

  return (
    <PageContainer>
      <PageHeader
        title={isGuest ? "ゲストユーザーはアクセスできません" : "アクセス権限がありません"}
      />
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {isGuest ? (
          <>
            <p className="text-sm text-slate-700">
              この機能を使用するには、一般ユーザーまたは管理者としてログインしてください。
            </p>
            <p className="text-sm text-slate-600">
              ゲストユーザーは以下のページのみ閲覧可能です（読み取り専用）：
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
              <li>ダッシュボード</li>
              <li>在庫一覧</li>
              <li>ロット一覧</li>
            </ul>
          </>
        ) : (
          <p className="text-sm text-slate-700">
            このページまたは操作に必要な権限がありません。必要な権限が付与されているか確認するか、
            管理者にお問い合わせください。
          </p>
        )}
        {fromPath && <p className="text-xs text-slate-500">直前のページ: {fromPath}</p>}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">ダッシュボードへ戻る</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/login">{isGuest ? "ログインする" : "ログイン画面へ"}</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
