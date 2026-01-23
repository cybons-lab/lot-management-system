import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";

export function AuthErrorOverlay() {
  const { authError, clearAuthError } = useAuth();
  const location = useLocation();

  if (!authError) {
    return null;
  }

  const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
  const isExpired = authError === "expired";
  const title = isExpired ? "セッションが切れました" : "権限がありません";
  const description = isExpired
    ? "再ログインが必要です。ログイン画面に移動してください。"
    : "この操作に必要な権限がありません。管理者にお問い合わせください。";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {isExpired ? (
            <Button asChild size="sm">
              <Link to={`/login?returnTo=${returnTo}`}>ログインする</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/dashboard">ダッシュボードへ戻る</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={clearAuthError}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}
