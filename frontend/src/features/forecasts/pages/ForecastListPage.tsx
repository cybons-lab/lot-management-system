/**
 * ForecastListPage (v2.4)
 * Forecast list page with grouped structure (customer × delivery_place × product)
 */

import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import type { ForecastGroup } from "../api";
import { ForecastListCard } from "../components";
import { useForecasts, useDeleteForecast } from "../hooks";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { generateAllocationSuggestions } from "@/features/allocations/api";

export function ForecastListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    customer_id: "",
    delivery_place_id: "",
    product_id: "",
  });

  const queryParams = {
    customer_id: filters.customer_id ? Number(filters.customer_id) : undefined,
    delivery_place_id: filters.delivery_place_id ? Number(filters.delivery_place_id) : undefined,
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
  };

  const { data: response, isLoading, isError, refetch } = useForecasts(queryParams);

  // Allocation Suggestion Generation
  const generateMutation = useMutation({
    mutationFn: generateAllocationSuggestions,
    onSuccess: (data) => {
      alert(`引当推奨を生成しました。\n生成数: ${data.suggestions.length}件`);
    },
    onError: (error) => {
      console.error("Generation failed:", error);
      alert("引当推奨の生成に失敗しました");
    },
  });

  const handleGenerateSuggestions = () => {
    const today = new Date();
    const periods: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      periods.push(period);
    }

    if (
      !confirm(`${periods.join(", ")} の引当推奨を生成しますか？\n既存の推奨は上書きされます。`)
    ) {
      return;
    }

    generateMutation.mutate({
      mode: "forecast",
      forecast_scope: {
        forecast_periods: periods,
      },
    });
  };

  const [openGroupKeys, setOpenGroupKeys] = useState<Set<string>>(new Set());

  // スクロール監視用
  const [focusedGroupKey, setFocusedGroupKey] = useState<string | null>(null);
  const itemsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Generate unique key for each group
  const getGroupKey = (group: ForecastGroup) => {
    const k = group.group_key;
    return `${k.customer_id}-${k.delivery_place_id}-${k.product_id}`;
  };

  useEffect(() => {
    if (response && response.items.length > 0) {
      setOpenGroupKeys((prev) => {
        const next = new Set(prev);
        const currentKeys = new Set(response.items.map(getGroupKey));
        for (const key of next) {
          if (!currentKeys.has(key)) {
            next.delete(key);
          }
        }
        if (next.size === 0 && response.items[0]) {
          next.add(getGroupKey(response.items[0]));
        }
        if (prev.size === next.size && [...prev].every((x) => next.has(x))) {
          return prev;
        }
        return next;
      });
    }
  }, [response]);

  const handleToggle = (groupKey: string) => {
    setOpenGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // スクロール監視
  useEffect(() => {
    if (isLoading || !response || response.items.length === 0) return;

    const options = {
      root: null,
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const key = entry.target.getAttribute("data-group-key");
          if (key) {
            setFocusedGroupKey(key);
          }
        }
      });
    }, options);

    itemsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [response, isLoading]);

  const groups = useMemo(() => {
    if (!response) return [];
    return response.items;
  }, [response]);

  const deleteMutation = useDeleteForecast();

  const handleDelete = async (forecastId: number) => {
    if (!confirm("このフォーキャストを削除しますか？")) return;

    try {
      await deleteMutation.mutateAsync(forecastId);
      refetch();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("削除に失敗しました");
    }
  };

  void navigate;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">フォーキャスト一覧</h2>
          <p className="mt-1 text-gray-600">顧客×納入先×製品でグループ化（v2.4）</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateSuggestions}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? "生成中..." : "引当推奨生成"}
          </Button>
          <Button onClick={() => navigate(ROUTES.FORECASTS.IMPORT)}>一括インポート</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-2 block text-sm font-medium">得意先ID</Label>
            <Input
              type="number"
              value={filters.customer_id}
              onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
              placeholder="得意先IDで絞り込み"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">納入場所ID</Label>
            <Input
              type="number"
              value={filters.delivery_place_id}
              onChange={(e) => setFilters({ ...filters, delivery_place_id: e.target.value })}
              placeholder="納入場所IDで絞り込み"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">製品ID</Label>
            <Input
              type="number"
              value={filters.product_id}
              onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
              placeholder="製品IDで絞り込み"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      ) : !response || response.items.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          フォーキャストが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{response.total}件のグループが見つかりました</div>

          <div className="space-y-3 pb-64">
            {groups.map((group) => {
              const groupKey = getGroupKey(group);
              const isOpen = openGroupKeys.has(groupKey);
              return (
                <ForecastListCard
                  key={groupKey}
                  ref={(el) => {
                    if (el) {
                      itemsRef.current.set(groupKey, el);
                      el.setAttribute("data-group-key", groupKey);
                    } else {
                      itemsRef.current.delete(groupKey);
                    }
                  }}
                  group={group}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                  isOpen={isOpen}
                  isActive={isOpen}
                  isFocused={groupKey === focusedGroupKey}
                  onToggle={() => handleToggle(groupKey)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
