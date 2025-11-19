/**
 * ForecastListCard - Collapsible card for forecast list
 * Shows header summary, expands to show ForecastDetailCard
 */

import { useState } from "react";

import type { ForecastHeader } from "../api";
import { useForecastHeader } from "../hooks";

import { ForecastDetailCard } from "./ForecastDetailCard";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ForecastListCardProps {
  header: ForecastHeader;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export function ForecastListCard({ header, onDelete, isDeleting }: ForecastListCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch full header with lines only when expanded
  const { data: fullForecast, isLoading: isLoadingDetail } = useForecastHeader(
    isExpanded ? header.id : 0
  );

  return (
    <Card className="overflow-hidden">
      {/* Collapsed Header */}
      <CardHeader
        className="cursor-pointer p-4 hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Expand/Collapse Icon */}
            <div className="text-gray-400">
              {isExpanded ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </div>

            {/* Header Info */}
            <div>
              <div className="font-medium">{header.forecast_number}</div>
              <div className="mt-1 text-sm text-gray-500">
                {header.customer_name ?? `ID: ${header.customer_id}`} /{" "}
                {header.delivery_place_name ?? `ID: ${header.delivery_place_id}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Badge */}
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                header.status === "active"
                  ? "bg-green-100 text-green-800"
                  : header.status === "completed"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {header.status}
            </span>

            {/* Date */}
            <div className="text-sm text-gray-500">
              {new Date(header.created_at).toLocaleDateString("ja-JP")}
            </div>

            {/* Delete Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(header.id);
              }}
              disabled={isDeleting}
            >
              削除
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="border-t bg-gray-50 p-4">
          {isLoadingDetail ? (
            <div className="py-8 text-center text-gray-500">明細を読み込み中...</div>
          ) : fullForecast ? (
            <ForecastDetailCard forecast={fullForecast} />
          ) : (
            <div className="py-8 text-center text-gray-500">明細の取得に失敗しました</div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
