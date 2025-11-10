/**
 * MovesPage.tsx
 *
 * 入出庫履歴ページ
 * - 将来的に入出庫トランザクションの履歴を表示
 * - 現在は枠組みのみ（Coming Soon）
 */

import { Section } from "@/shared/components/layout";

// ============================================
// メインコンポーネント
// ============================================

export function MovesPage() {
  return (
    <div className="space-y-6">
      {/* Coming Soonメッセージ */}
      <Section>
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <div className="mx-auto max-w-md">
            {/* アイコン */}
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>

            {/* タイトル */}
            <h2 className="mb-2 text-2xl font-bold text-gray-900">入出庫履歴</h2>

            {/* 説明 */}
            <p className="mb-6 text-gray-600">
              この機能は現在開発中です。入出庫のトランザクション履歴を表示・検索できるようになります。
            </p>

            {/* 予定機能リスト */}
            <div className="mt-8 text-left">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">予定機能：</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2 text-blue-500">✓</span>
                  <span>入庫・出庫トランザクションの履歴表示</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-500">✓</span>
                  <span>日付範囲、ロット番号、製品コードでの絞り込み</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-500">✓</span>
                  <span>CSV/Excelエクスポート機能</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-500">✓</span>
                  <span>在庫変動のグラフ表示</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
