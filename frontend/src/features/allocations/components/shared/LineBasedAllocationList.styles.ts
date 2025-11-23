/**
 * LineBasedAllocationList用のスタイル定義
 * フロントエンドスタイルガイドに準拠
 */

// ルートコンテナ
export const root = "mx-auto w-full max-w-5xl space-y-8 p-4 pb-20";

// 一括操作ヘッダー
export const bulkActionsHeader =
  "mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-sm";
export const bulkActionsLeft = "flex items-center gap-3";
export const bulkActionsRight = "flex items-center gap-3";
export const bulkActionsLabel = "text-sm font-bold text-gray-700";
export const bulkActionsSelectedCount = "text-xs text-gray-500";

// フィルタバー（sticky固定）
// ページナビの高さ(h-16 = 4rem = 64px)を考慮してtop-16に設定
export const filterBar =
  "sticky top-16 z-50 mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:bg-white/90";
export const filterLabel = "flex items-center gap-2 pr-4 text-sm font-bold text-gray-600";

// グルーピングトグル
export const groupingToggleContainer =
  "ml-auto flex items-center gap-2 border-l border-gray-300 pl-4";
export const groupingToggleLabel = "text-xs font-medium text-gray-600";

// ジャンプボタンコンテナ
export const jumpButtonContainer = "fixed right-8 bottom-8 z-50 flex flex-col gap-3";

// Order Card (Denormalized)
export const orderCard = (isChecked: boolean) =>
  `group/order mb-6 overflow-hidden rounded-xl border transition-all duration-300 ${
    isChecked
      ? "border-green-200 bg-green-50/50 shadow-sm hover:shadow-md"
      : "border-gray-200 bg-white shadow-md hover:scale-[1.01] hover:shadow-2xl"
  }`;

export const orderCardHeader = (isChecked: boolean) =>
  `flex items-center justify-between px-6 py-3 ${
    isChecked ? "border-none bg-green-50/80" : "border-b border-gray-200 bg-gray-50"
  }`;

export const orderCardHeaderLeft = "flex items-center gap-4";
export const orderCardHeaderRight = "flex items-center gap-4";

export const orderCardBody = "bg-gray-50/30 p-6";

// チェックボックス
export const checkbox =
  "h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500";

// 受注番号表示
export const orderLabel = "text-xs font-bold text-gray-500";
export const orderNumber = "font-mono text-lg font-bold text-gray-900";

// 顧客名
export const customerName = "font-bold text-gray-800";

// 受注日
export const orderDate = "flex items-center gap-2 text-sm text-gray-600";

// 完了バッジ
export const completedBadge = "flex items-center gap-2 rounded-full bg-green-200 px-3 py-1";
export const completedBadgeText = "text-xs font-bold text-green-700";

// セクション区切り（チェック済み/未チェック）
export const sectionDivider = "my-8 flex items-center gap-4";
export const sectionDividerLine =
  "h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent";
export const sectionDividerBadge =
  "flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1 text-xs font-medium text-green-700 shadow-sm";

// グルーピング表示用
export const groupHeaderContainer =
  "mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 shadow-sm";
export const groupHeaderTitle = "mb-2 flex items-center justify-between";
export const groupHeaderLeft = "flex items-center gap-4";
export const groupHeaderBadge = "rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white";
export const groupLinesContainer = "space-y-4";
