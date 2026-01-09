/**
 * チャートコンテナ共通コンポーネント
 *
 * グラフ表示用のカードラッパー（ローディング・エラー状態対応）
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  title: string;
  description?: string;
  subtitle?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  height?: string;
}

export function ChartContainer({
  title,
  description,
  subtitle,
  children,
  isLoading = false,
  error = null,
  height = "h-64",
}: ChartContainerProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {(description || subtitle) && (
          <CardDescription className="text-xs">{description || subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className={cn("w-full rounded-md", height)} />
        ) : error ? (
          <div className={`flex ${height} items-center justify-center text-red-600`}>
            データの取得に失敗しました
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
