import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 出荷票テキスト置換ルールの説明コンポーネント
 * OCR結果編集モーダル内で、ユーザーが置換ロジックを理解できるように表示する
 */
const replacementTimingItems = [
  "フィールドから離れた瞬間（フォーカスアウト時）",
  "数量の +/- ボタンをクリックした直後",
  "ページを開いた際の初期表示時",
];

const quantityRuleItems = [
  "数量がある場合: ロットA(10)/ロットB(20) 形式",
  "数量が空欄: カッコごと非表示（エラーは出ません）",
  "複数ロット: スラッシュ(/)で区切り",
];

const placeholderItems = [
  { token: "▲/▲", description: "出荷日 (mm/dd) ※納期から輸送LT日数を減算" },
  { token: "●/●", description: "納期 (mm/dd)" },
  { token: "入庫番号", description: "入庫番号に置換" },
  { token: "ロット", description: "ロット(数量) 形式に置換 ※半角カッコ" },
];

function ExpandIcon() {
  return (
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
  );
}

function Section({
  barColorClass,
  title,
  children,
}: {
  barColorClass: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="flex items-center gap-1 font-bold text-slate-700">
        <span className={`inline-block h-4 w-1 rounded-full ${barColorClass}`} />
        {title}
      </h4>
      {children}
    </div>
  );
}

function SummaryHeader() {
  return (
    <summary className="list-none flex cursor-pointer items-center justify-between text-xs font-bold tracking-wider text-slate-500 uppercase transition-colors hover:text-slate-800">
      <div className="flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5" />
        <span>出荷票テキスト置換ルール</span>
      </div>
      <ExpandIcon />
    </summary>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-0.5 pl-3 text-slate-600">
      {items.map((item) => (
        <p key={item}>• {item}</p>
      ))}
    </div>
  );
}

function PlaceholderList() {
  return (
    <div className="space-y-1 pl-3">
      <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-0.5 text-slate-600">
        {placeholderItems.map((item) => (
          <div key={item.token} className="contents">
            <span className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">
              {item.token}
            </span>
            <span>{item.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaveTimingSection() {
  return (
    <Section barColorClass="bg-green-500" title="保存タイミング">
      <div className="space-y-0.5 pl-3 text-slate-600">
        <p>
          • <strong className="text-green-700">自動保存:</strong> フィールド変更後0.5秒で自動保存
        </p>
        <p>
          • <strong className="text-green-700">手動保存:</strong> 「保存」ボタンで明示的に保存可能
        </p>
      </div>
    </Section>
  );
}

function SpecialCasesSection() {
  return (
    <Section barColorClass="bg-red-500" title="特殊ケース">
      <div className="space-y-1 pl-3 text-slate-600">
        <div className="rounded border border-slate-300 bg-white p-2">
          <p className="mb-0.5 font-semibold text-slate-700">
            テンプレートに「入庫番号」のみの場合:
          </p>
          <p className="text-[10px]">入庫番号 → ロット(数量)/入庫番号(数量) に自動拡張</p>
        </div>
        <div className="rounded border border-slate-300 bg-white p-2">
          <p className="mb-0.5 font-semibold text-slate-700">
            テンプレートに「入庫番号/ロット」がある場合:
          </p>
          <p className="text-[10px]">入庫番号 → 入庫番号</p>
          <p className="text-[10px]">ロット → ロット(数量)</p>
        </div>
      </div>
    </Section>
  );
}

function RulesContent() {
  return (
    <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-xs">
      <Section barColorClass="bg-blue-500" title="テキスト書き換えタイミング">
        <BulletList items={replacementTimingItems} />
      </Section>

      <SaveTimingSection />

      <Section barColorClass="bg-purple-500" title="プレースホルダー">
        <PlaceholderList />
      </Section>

      <Section barColorClass="bg-orange-500" title="数量表記ルール">
        <BulletList items={quantityRuleItems} />
      </Section>

      <SpecialCasesSection />
    </div>
  );
}

export function ShippingTextReplacementRules() {
  return (
    <div className="mt-4 border-t pt-4">
      <details className="group">
        <SummaryHeader />
        <RulesContent />
      </details>
    </div>
  );
}
