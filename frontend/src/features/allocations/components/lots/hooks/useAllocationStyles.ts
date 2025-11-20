import { cn } from "@/shared/libs/utils";

interface UseAllocationStylesParams {
  isActive: boolean;
  isComplete: boolean;
  isOver: boolean;
}

interface AllocationStyles {
  containerClasses: string;
}

/**
 * 引当パネルのスタイリングロジックを集約するカスタムフック
 * アクティブ状態、完了状態、エラー状態に応じたクラス名を生成
 */
export function useAllocationStyles({
  isActive,
  isComplete,
  isOver,
}: UseAllocationStylesParams): AllocationStyles {
  const containerClasses = cn(
    "flex flex-col rounded-lg border transition-all duration-300 ease-out",

    // 1. 非アクティブ（かつ未完了・エラーなし）: 薄暗く沈ませる
    !isActive &&
      !isComplete &&
      !isOver &&
      "bg-gray-100/80 border-gray-200 opacity-60 grayscale-[0.3] scale-[0.99]",

    // 2. アクティブ（選択中）: 明るくポップアップさせる
    isActive &&
      !isComplete &&
      !isOver &&
      "bg-white border-blue-300 shadow-xl opacity-100 grayscale-0 scale-[1.005] z-10 ring-1 ring-blue-100",

    // 3. 完了時: 緑枠固定
    isComplete &&
      "bg-white border-green-500 ring-1 ring-green-500 shadow-green-100 opacity-80 hover:opacity-100",

    // 4. エラー時: 赤枠強調
    isOver && "bg-red-50 border-red-300 ring-1 ring-red-300 opacity-100",
  );

  return { containerClasses };
}
