/**
 * ForecastListPage (v2.2 - Phase B-3)
 * Forecast headers list page with header/lines separation
 */

import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { ForecastListCard } from "../components";
import { useForecastHeaders, useDeleteForecastHeader } from "../hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";

export function ForecastListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    customer_id: "",
    delivery_place_id: "",
    status: "" as "" | "active" | "completed" | "cancelled",
  });

  const queryParams = {
    customer_id: filters.customer_id ? Number(filters.customer_id) : undefined,
    delivery_place_id: filters.delivery_place_id ? Number(filters.delivery_place_id) : undefined,
    status: filters.status || undefined,
  };

  const { data: headers, isLoading, isError, refetch } = useForecastHeaders(queryParams);

  const [openForecastIds, setOpenForecastIds] = useState<Set<number>>(new Set());

  // スクロール監視用
  const [focusedForecastId, setFocusedForecastId] = useState<number | null>(null);
  const itemsRef = useRef<Map<number, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    if (headers && headers.length > 0) {
      setOpenForecastIds((prev) => {
        const next = new Set(prev);
        const currentIds = new Set(headers.map((h) => h.forecast_id));
        for (const id of next) {
          if (!currentIds.has(id)) {
            next.delete(id);
          }
        }
        if (next.size === 0 && headers[0]) {
          next.add(headers[0].forecast_id);
        }
        if (prev.size === next.size && [...prev].every((x) => next.has(x))) {
          return prev;
        }
        return next;
      });
    }
  }, [headers]);

  const handleToggle = (id: number) => {
    setOpenForecastIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // スクロール監視
  useEffect(() => {
    if (isLoading || !headers || headers.length === 0) return;

    const options = {
      root: null,
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = Number(entry.target.getAttribute("data-forecast-id"));
          if (!isNaN(id)) {
            setFocusedForecastId(id);
          }
        }
      });
    }, options);

    itemsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headers, isLoading]);

  // ★ 修正: 表示データの計算とユニークカウント
  // APIから返ってきたheadersを、顧客ID+納入先ID(あれば製品も)でユニークにする
  const { displayedHeaders, uniqueCount } = useMemo(() => {
    if (!headers) return { displayedHeaders: [], uniqueCount: 0 };

    // 単純なリスト表示用
    const list = headers;

    // ユニーク件数の計算
    // 複合キー: customer_id - delivery_place_id (- product_id ※もしヘッダーにあれば)
    const uniqueSet = new Set<string>();
    list.forEach((h) => {
      // product_idがヘッダーにない場合はヘッダー単位のユニーク数になります
      // もしAPIレスポンスに product_id が含まれているなら `-${h.product_id}` を追加してください
      const key = `${h.customer_id}-${h.delivery_place_id}`;
      uniqueSet.add(key);
    });

    return { displayedHeaders: list, uniqueCount: uniqueSet.size };
  }, [headers]);

  const deleteMutation = useDeleteForecastHeader();

  const handleDelete = async (id: number) => {
    if (!confirm("このフォーキャストを削除しますか？")) return;

    try {
      await deleteMutation.mutateAsync(id);
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
          <p className="mt-1 text-gray-600">ヘッダ・明細分離構造（v2.2）</p>
        </div>
        <Button onClick={() => navigate(ROUTES.FORECASTS.IMPORT)}>一括インポート</Button>
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
            <Label className="mb-2 block text-sm font-medium">ステータス</Label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as "" | "active" | "completed" | "cancelled",
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">すべて</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
      ) : !headers || headers.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          フォーキャストが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          {/* ★ 修正: カウント表示をユニーク数に変更 */}
          <div className="text-sm text-gray-600">
            {uniqueCount}件のフォーキャストが見つかりました
            {/* もし表示数とユニーク数が違う場合に内訳を出すなら以下のように書けます */}
            {uniqueCount !== displayedHeaders.length && (
              <span className="ml-2 text-xs text-gray-400">
                (リスト表示数: {displayedHeaders.length})
              </span>
            )}
          </div>

          <div className="space-y-3 pb-64">
            {displayedHeaders.map((header) => {
              const isOpen = openForecastIds.has(header.forecast_id);
              return (
                <ForecastListCard
                  key={header.forecast_id}
                  ref={(el) => {
                    if (el) {
                      itemsRef.current.set(header.forecast_id, el);
                      el.setAttribute("data-forecast-id", String(header.forecast_id));
                    } else {
                      itemsRef.current.delete(header.forecast_id);
                    }
                  }}
                  header={header}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                  isOpen={isOpen}
                  isActive={isOpen}
                  isFocused={header.forecast_id === focusedForecastId}
                  onToggle={handleToggle}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
