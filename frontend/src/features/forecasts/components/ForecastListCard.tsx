import { forwardRef } from "react";
import type { ForecastHeader } from "../api";
import { useForecastHeader } from "../hooks";

import { ForecastDetailCard } from "./ForecastDetailCard";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ForecastListCardProps {
  header: ForecastHeader;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  isOpen: boolean;
  isActive: boolean;
  isFocused?: boolean; // ★ 追加
  onToggle: (id: number) => void;
}

// ★ forwardRefを使って親からのrefをDOMに渡せるように変更
export const ForecastListCard = forwardRef<HTMLDivElement, ForecastListCardProps>(
  ({ header, onDelete, isDeleting, isOpen, isActive, isFocused, onToggle }, ref) => {
    const { data: fullForecast, isLoading: isLoadingDetail } = useForecastHeader(
      header.forecast_id,
    );

    // データロード中
    if (isLoadingDetail) {
      return (
        <div ref={ref} data-forecast-id={header.forecast_id} className="scroll-mt-24">
          <Card data-forecast-number={header.forecast_number}>
            <CardHeader className="p-4 text-sm text-gray-500">明細を読み込み中...</CardHeader>
          </Card>
        </div>
      );
    }

    // エラー時
    if (!fullForecast) {
      return (
        <div ref={ref} data-forecast-id={header.forecast_id} className="scroll-mt-24">
          <Card data-forecast-number={header.forecast_number}>
            <CardContent className="p-4 text-sm text-gray-500">
              明細の取得に失敗しました
            </CardContent>
          </Card>
        </div>
      );
    }

    // 正常表示
    // Wrapper divにrefをつけてIntersectionObserverで検知させる
    return (
      <div ref={ref} data-forecast-id={header.forecast_id} className="scroll-mt-24">
        <ForecastDetailCard
          forecast={fullForecast}
          onDelete={onDelete}
          isDeleting={isDeleting}
          isOpen={isOpen}
          isActive={isActive}
          isFocused={isFocused} // ★ Propsを伝播
          onToggle={onToggle}
        />
      </div>
    );
  },
);

ForecastListCard.displayName = "ForecastListCard";
