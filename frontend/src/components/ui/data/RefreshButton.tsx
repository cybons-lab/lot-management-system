import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

interface RefreshButtonProps {
  /**
   * 再読み込み対象のReact Queryキー
   * 例: ["lots"], ["orders"], ["inventory"]
   */
  queryKey: readonly unknown[];
  /**
   * ローディング状態（親コンポーネントから渡す）
   */
  isLoading?: boolean;
  /**
   * ボタンサイズ
   */
  size?: "sm" | "default" | "lg";
  /**
   * ボタンバリアント
   */
  variant?: "outline" | "default" | "ghost";
  /**
   * カスタムクラス名
   */
  className?: string;
  /**
   * 成功メッセージ（デフォルト: "データを再読み込みしました"）
   */
  successMessage?: string;
}

/**
 * データ再読み込みボタン（共通コンポーネント）
 *
 * React Queryのキャッシュを無効化してデータを再取得します。
 * F5によるページ全体リロードを避け、SPA体験を維持しながらデータを最新化できます。
 *
 * @example
 * ```tsx
 * <RefreshButton
 *   queryKey={["lots"]}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function RefreshButton({
  queryKey,
  isLoading = false,
  size = "sm",
  variant = "outline",
  className,
  successMessage = "データを再読み込みしました",
}: RefreshButtonProps) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey });
    toast.success(successMessage);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("bg-gray-50", className)}
      onClick={handleRefresh}
      disabled={isLoading}
    >
      <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
      再読み込み
    </Button>
  );
}
