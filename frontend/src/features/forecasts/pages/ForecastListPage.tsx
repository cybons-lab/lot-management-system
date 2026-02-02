/**
 * ForecastListPage (v2.5)
 * Forecast list page with grouped structure (customer × delivery_place × product)
 * フィルタとグループ展開状態がsessionStorageで永続化される
 */

import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { ForecastGroup } from "../api";
import { AddForecastDialog, ForecastListCard } from "../components";
import { useForecasts, useDeleteForecast } from "../hooks";
import { useForecastListPageState } from "../hooks/useForecastListPageState";

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
import { ExportButton } from "@/shared/components/ExportButton";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function ForecastListPage() {
  const navigate = useNavigate();

  // フィルタとグループ展開状態（sessionStorageで永続化）
  const { filters, openGroupKeys, queryParams, updateFilter, toggleGroupKey, setOpenGroupKeys } =
    useForecastListPageState();

  // 確認ダイアログの状態（一時的なUI状態なので永続化しない）
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [addForecastOpen, setAddForecastOpen] = useState(false);
  const [pendingPeriods, setPendingPeriods] = useState<string[]>([]);

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
        label: `${p.maker_part_no} - ${p.display_name}`,
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
      toast.success(`計画引当を更新しました。\n生成数: ${data.suggestions.length}件`);
    },
    onError: (error) => {
      console.error("Generation failed:", error);
      toast.error("計画引当の更新に失敗しました");
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

  // スクロール監視用
  const [focusedGroupKey, setFocusedGroupKey] = useState<string | null>(null);
  const itemsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Generate unique key for each group
  const getGroupKey = (group: ForecastGroup) => {
    const k = group.group_key;
    return `${k.customer_id}-${k.delivery_place_id}-${k.supplier_item_id}`;
  };

  // データが変わったときにopenGroupKeysを調整
  useEffect(() => {
    if (response && response.items.length > 0) {
      const currentKeys = new Set(response.items.map(getGroupKey));
      const validKeys = Array.from(openGroupKeys).filter((key) => currentKeys.has(key));

      // 開いているグループがなければ最初のグループを開く
      if (validKeys.length === 0 && response.items[0]) {
        setOpenGroupKeys([getGroupKey(response.items[0])]);
      } else if (validKeys.length !== openGroupKeys.size) {
        // 存在しないキーを削除
        setOpenGroupKeys(validKeys);
      }
    }
  }, [response, openGroupKeys, setOpenGroupKeys]);

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
      <PageHeader
        title="フォーキャスト一覧"
        subtitle="顧客×納入先×製品でグループ化（v2.5）"
        actions={
          <div className="flex gap-2">
            <ExportButton
              apiPath="forecasts/export/download"
              filePrefix="forecasts"
              size="default"
            />
            <Button
              variant="outline"
              onClick={handleGenerateSuggestions}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? "更新中..." : "計画引当を更新"}
            </Button>
            <Button variant="outline" onClick={() => navigate(ROUTES.FORECASTS.IMPORT)}>
              一括インポート
            </Button>
            <Button onClick={() => setAddForecastOpen(true)}>手動追加</Button>
          </div>
        }
      />

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-2 block text-sm font-medium">得意先</Label>
            <SearchableSelect
              options={customerOptions}
              value={filters.customer_id}
              onChange={(value) => updateFilter("customer_id", value)}
              placeholder="得意先を検索..."
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">納入場所</Label>
            <SearchableSelect
              options={deliveryPlaceOptions}
              value={filters.delivery_place_id}
              onChange={(value) => updateFilter("delivery_place_id", value)}
              placeholder="納入場所を検索..."
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">製品</Label>
            <SearchableSelect
              options={productOptions}
              value={filters.supplier_item_id}
              onChange={(value) => updateFilter("supplier_item_id", value)}
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
                  onToggle={() => toggleGroupKey(groupKey)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 計画引当更新 確認ダイアログ */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>計画引当の更新</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPeriods.join(", ")} の計画引当を更新しますか？
              <br />
              既存の推奨は上書きされます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGenerate}>更新する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* 手動追加ダイアログ */}
      <AddForecastDialog
        open={addForecastOpen}
        onOpenChange={setAddForecastOpen}
        onSuccess={refetch}
      />
    </PageContainer>
  );
}
