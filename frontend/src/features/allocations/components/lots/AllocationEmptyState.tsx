interface AllocationEmptyStateProps {
  type: "no-orderline" | "loading" | "error" | "no-candidates";
  error?: Error | null;
}

/**
 * 引当パネルの空状態を表示するコンポーネント
 * - 明細未選択
 * - ローディング中
 * - エラー発生
 * - 候補ロットなし
 */
export function AllocationEmptyState({ type, error }: AllocationEmptyStateProps) {
  if (type === "no-orderline") {
    return (
      <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
          明細を選択してください
        </div>
      </div>
    );
  }

  if (type === "loading") {
    return <div className="p-8 text-center text-sm text-gray-500">候補ロットを読み込み中...</div>;
  }

  if (type === "error") {
    return (
      <div className="bg-red-50 p-4 text-center text-sm text-red-600">
        エラーが発生しました
        {error && <div className="mt-1 text-xs">{error.message}</div>}
      </div>
    );
  }

  if (type === "no-candidates") {
    return <div className="p-8 text-center text-gray-500">候補ロットがありません</div>;
  }

  return null;
}
