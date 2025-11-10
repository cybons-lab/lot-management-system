import * as React from "react";
// frontend/src/features/orders/components/ForecastSection.tsx (改善版)

type Props = {
  productCode?: string;
  /** 全幅表示モード */
  fullWidth?: boolean;
};

export function ForecastSection({ productCode, fullWidth = false }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!productCode) return null;

  return (
    <div className={`rounded-lg border ${fullWidth ? "w-full" : ""}`}>
      <button
        className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">フォーキャスト</span>
          <span className="text-xs text-gray-500">({productCode} の需要予測)</span>
        </div>
        <span className="text-gray-400">{isOpen ? "▼" : "▶"}</span>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t bg-gray-50 p-4">
          {/* 説明 */}
          <p className="text-xs text-gray-600">
            この製品の需要予測や在庫推移を確認できます。
            Forecast一覧に表示されている商品の品番が一致しているものを表示します。
          </p>

          {/* サマリ情報（将来的に実装） */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded border bg-white p-2">
              <div className="text-xs text-gray-500">今月予測</div>
              <div className="text-lg font-semibold">120</div>
            </div>
            <div className="rounded border bg-white p-2">
              <div className="text-xs text-gray-500">来月予測</div>
              <div className="text-lg font-semibold">150</div>
            </div>
            <div className="rounded border bg-white p-2">
              <div className="text-xs text-gray-500">在庫予測</div>
              <div className="text-lg font-semibold text-green-600">安全</div>
            </div>
          </div>

          {/* 詳細リンク */}
          <div className="flex gap-2">
            <a
              href={`/forecast?product=${encodeURIComponent(productCode)}`}
              className="inline-flex items-center gap-2 rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              詳細フォーキャストを見る
            </a>

            <a
              href={`/forecast`}
              className="inline-flex items-center gap-2 rounded border px-4 py-2 text-sm hover:bg-gray-100"
            >
              フォーキャスト一覧
            </a>
          </div>

          {/* 注意事項 */}
          <div className="rounded border bg-white p-2 text-xs text-gray-500">
            💡 品番が一致する製品のみ表示されます。詳細な予測グラフは上記リンクから確認できます。
          </div>
        </div>
      )}
    </div>
  );
}
