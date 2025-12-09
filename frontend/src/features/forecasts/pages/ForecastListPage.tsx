/**
 * ForecastListPage (v2.4)
 * Forecast list page with grouped structure (customer × delivery_place × product)
 */

import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { ForecastGroup } from "../api";
import { ForecastListCard } from "../components";
import { useForecasts, useDeleteForecast } from "../hooks";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Label,
} from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { ROUTES } from "@/constants/routes";
import { generateAllocationSuggestions } from "@/features/allocations/api";
import { useCustomersQuery, useProductsQuery } from "@/hooks/api/useMastersQuery";
import { PageContainer } from "@/shared/components/layout/PageContainer";

export function ForecastListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    customer_id: "",
    delivery_place_id: "",
    product_id: "",
  });

  // 確認ダイアログの状態
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingPeriods, setPendingPeriods] = useState<string[]>([]);

  const queryParams = {
    customer_id: filters.customer_id ? Number(filters.customer_id) : undefined,
    delivery_place_id: filters.delivery_place_id ? Number(filters.delivery_place_id) : undefined,
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
  };

  const { data: response, isLoading, isError, refetch } = useForecasts(queryParams);

  // Master data for filter options
  const { data: customers = [] } = useCustomersQuery();
  const { data: products = [] } = useProductsQuery();

  // Generate filter options
  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: `${c.customer_code} - ${c.customer_name}`,
      })),
    [customers],
  );

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: `${p.product_code} - ${p.product_name}`,
      })),
    [products],
  );

  // Delivery place options extracted from forecast data
  const deliveryPlaceOptions = useMemo(() => {
    if (!response?.items) return [];
    const seen = new Set<string>();
    return response.items
      .filter((g) => {
        const key = String(g.group_key.delivery_place_id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((g) => ({
        value: String(g.group_key.delivery_place_id),
        label: g.group_key.delivery_place_name || `納入場所ID: ${g.group_key.delivery_place_id}`,
      }));
  }, [response]);

  // Allocation Suggestion Generation
  const generateMutation = useMutation({
    mutationFn: generateAllocationSuggestions,
    onSuccess: (data) => {
      toast.success(`引当推奨を生成しました。\n生成数: ${data.suggestions.length}件`);
    },
    onError: (error) => {
      console.error("Generation failed:", error);
      toast.error("引当推奨の生成に失敗しました");
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

    // ダイアログを開く
    setPendingPeriods(periods);
    setConfirmDialogOpen(true);
  };

  const handleConfirmGenerate = () => {
    setConfirmDialogOpen(false);
    generateMutation.mutate({
      mode: "forecast",
      forecast_scope: {
        forecast_periods: pendingPeriods,
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
      toast.error("削除に失敗しました");
    }
  };

  void navigate;

  return (
    <PageContainer>
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
            <Label className="mb-2 block text-sm font-medium">得意先</Label>
            <SearchableSelect
              options={customerOptions}
              value={filters.customer_id}
              onChange={(value) => setFilters({ ...filters, customer_id: value })}
              placeholder="得意先を検索..."
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">納入場所</Label>
            <SearchableSelect
              options={deliveryPlaceOptions}
              value={filters.delivery_place_id}
              onChange={(value) => setFilters({ ...filters, delivery_place_id: value })}
              placeholder="納入場所を検索..."
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">製品</Label>
            <SearchableSelect
              options={productOptions}
              value={filters.product_id}
              onChange={(value) => setFilters({ ...filters, product_id: value })}
              placeholder="製品を検索..."
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
            {groups.map((group: ForecastGroup) => {
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

      {/* 引当推奨生成 確認ダイアログ */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>引当推奨の生成</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPeriods.join(", ")} の引当推奨を生成しますか？
              <br />
              既存の推奨は上書きされます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGenerate}>生成する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
