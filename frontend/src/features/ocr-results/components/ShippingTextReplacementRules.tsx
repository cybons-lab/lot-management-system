import { HelpCircle } from "lucide-react";

/**
 * 出荷票テキスト置換ルールの説明コンポーネント
 * OCR結果編集モーダル内で、ユーザーが置換ロジックを理解できるように表示する
 */
// eslint-disable-next-line max-lines-per-function -- ルール説明UIの論理的なまとまり
export function ShippingTextReplacementRules() {
  return (
    <div className="mt-4 border-t pt-4">
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider list-none">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>出荷票テキスト置換ルール</span>
          </div>
          <span className="transition-transform group-open:rotate-180">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>

        <div className="mt-3 rounded-md bg-slate-50 p-4 text-xs border border-slate-200 space-y-3">
          {/* テキスト書き換えタイミング */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-700 flex items-center gap-1">
              <span className="inline-block w-1 h-4 bg-blue-500 rounded-full" />
              テキスト書き換えタイミング
            </h4>
            <div className="pl-3 space-y-0.5 text-slate-600">
              <p>• フィールドから離れた瞬間（フォーカスアウト時）</p>
              <p>• 数量の +/- ボタンをクリックした直後</p>
              <p>• ページを開いた際の初期表示時</p>
            </div>
          </div>

          {/* 保存タイミング */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-700 flex items-center gap-1">
              <span className="inline-block w-1 h-4 bg-green-500 rounded-full" />
              保存タイミング
            </h4>
            <div className="pl-3 space-y-0.5 text-slate-600">
              <p>
                • <strong className="text-green-700">自動保存:</strong>{" "}
                フィールド変更後0.5秒で自動保存
              </p>
              <p>
                • <strong className="text-green-700">手動保存:</strong>{" "}
                「保存」ボタンで明示的に保存可能
              </p>
            </div>
          </div>

          {/* プレースホルダー一覧 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-700 flex items-center gap-1">
              <span className="inline-block w-1 h-4 bg-purple-500 rounded-full" />
              プレースホルダー
            </h4>
            <div className="pl-3 space-y-1">
              <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-0.5 text-slate-600">
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 text-[10px]">
                  ▲/▲
                </span>
                <span>出荷日 (mm/dd) ※納期から輸送LT日数を減算</span>

                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 text-[10px]">
                  ●/●
                </span>
                <span>納期 (mm/dd)</span>

                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 text-[10px]">
                  入庫番号
                </span>
                <span>入庫番号に置換</span>

                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 text-[10px]">
                  ロット
                </span>
                <span>ロット(数量) 形式に置換 ※半角カッコ</span>
              </div>
            </div>
          </div>

          {/* 数量表記ルール */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-700 flex items-center gap-1">
              <span className="inline-block w-1 h-4 bg-orange-500 rounded-full" />
              数量表記ルール
            </h4>
            <div className="pl-3 space-y-0.5 text-slate-600">
              <p>• 数量がある場合: ロットA(10)/ロットB(20) 形式</p>
              <p>• 数量が空欄: カッコごと非表示（エラーは出ません）</p>
              <p>• 複数ロット: スラッシュ(/)で区切り</p>
            </div>
          </div>

          {/* 特殊ケース */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-700 flex items-center gap-1">
              <span className="inline-block w-1 h-4 bg-red-500 rounded-full" />
              特殊ケース
            </h4>
            <div className="pl-3 space-y-1 text-slate-600">
              <div className="bg-white p-2 rounded border border-slate-300">
                <p className="font-semibold text-slate-700 mb-0.5">
                  テンプレートに「入庫番号」のみの場合:
                </p>
                <p className="text-[10px]">入庫番号 → ロット(数量)/入庫番号(数量) に自動拡張</p>
              </div>
              <div className="bg-white p-2 rounded border border-slate-300">
                <p className="font-semibold text-slate-700 mb-0.5">
                  テンプレートに「入庫番号/ロット」がある場合:
                </p>
                <p className="text-[10px]">入庫番号 → 入庫番号</p>
                <p className="text-[10px]">ロット → ロット(数量)</p>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
