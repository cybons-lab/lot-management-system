import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ===== 型定義 =====

interface ForecastData {
  id: number;
  product_code: string;
  product_name: string;
  customer_code: string;
  granularity: "daily" | "dekad" | "monthly";
  version_no: number;
  updated_at: string;
  customer_name?: string;
  supplier_name?: string;
  unit?: string;
  version_history?: unknown[];
}

interface ForecastGroup {
  productCode: string;
  productName: string;
  customerCode: string;
  customerName: string | null;
  unit: string;
  daily: ForecastData | null;
  dekad: ForecastData | null;
  monthly: ForecastData | null;
}

// ===== メインコンポーネント =====

export function ForecastListPage() {
  const [filters, setFilters] = useState({
    product_code: "",
    customer_code: "",
  });

  // フォーキャストデータを取得
  const forecastsQuery = useQuery<ForecastData[]>({
    queryKey: ["forecasts"],
    queryFn: async (): Promise<ForecastData[]> => {
      // TODO: forecasts APIが不要なら削除。必要なら api に実装を追加。
      // const res = await api.getForecasts();
      // return res.data.items as ForecastData[];
      return [];
    },
  });

  // 製品×顧客でグループ化
  const grouped = useMemo<ForecastGroup[]>(() => {
    if (!forecastsQuery.data) return [];

    const map = new Map<string, ForecastGroup>();

    forecastsQuery.data.forEach((fc) => {
      const key = `${fc.product_code}__${fc.customer_code}`;

      if (!map.has(key)) {
        map.set(key, {
          productCode: fc.product_code,
          productName: fc.product_name,
          customerCode: fc.customer_code,
          customerName: fc.customer_name ?? null,
          unit: fc.unit ?? "EA",
          daily: null,
          dekad: null,
          monthly: null,
        });
      }

      const group = map.get(key)!;
      if (fc.granularity === "daily") group.daily = fc;
      if (fc.granularity === "dekad") group.dekad = fc;
      if (fc.granularity === "monthly") group.monthly = fc;
    });

    let result = Array.from(map.values());

    // 製品コードまたは商品名でフィルタリング
    const productKeyword = filters.product_code.trim().toLowerCase();
    if (productKeyword) {
      result = result.filter((group) => {
        const name = group.productName?.toLowerCase() ?? "";
        return (
          group.productCode.toLowerCase().includes(productKeyword) || name.includes(productKeyword)
        );
      });
    }

    // 顧客コードまたは得意先名でフィルタリング
    const customerKeyword = filters.customer_code.trim().toLowerCase();
    if (customerKeyword) {
      result = result.filter((group) => {
        const name = group.customerName?.toLowerCase() ?? "";
        return (
          group.customerCode.toLowerCase().includes(customerKeyword) ||
          name.includes(customerKeyword)
        );
      });
    }

    return result;
  }, [forecastsQuery.data, filters.product_code, filters.customer_code]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Forecast 一覧</h2>
        <p className="mt-1 text-gray-600">
          製品×得意先ごとの需要予測を日・旬・月の粒度で確認できます
        </p>
      </div>

      {/* 絞り込みフィルター */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-2 block text-sm font-medium">製品コード / 商品名</Label>
            <Input
              type="text"
              value={filters.product_code}
              onChange={(e) => setFilters({ ...filters, product_code: e.target.value })}
              placeholder="製品コードまたは商品名で絞り込み"
              className="w-full px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">例: "PRD-001" または "製品A" など</p>
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">顧客コード / 得意先名</Label>
            <Input
              type="text"
              value={filters.customer_code}
              onChange={(e) => setFilters({ ...filters, customer_code: e.target.value })}
              placeholder="顧客コードまたは得意先名で絞り込み"
              className="w-full px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">例: "CUS-001" または "得意先A" など</p>
          </div>
        </div>
      </div>

      {/* データ表示エリア */}
      {forecastsQuery.isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          フォーキャストを読み込み中...
        </div>
      ) : forecastsQuery.isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          {filters.product_code || filters.customer_code
            ? "条件に一致するフォーキャストがありません"
            : "登録されているフォーキャストがありません"}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-sm text-gray-600">
            {grouped.length} 件の製品×得意先の組み合わせが見つかりました
          </div>
          {grouped.map((group) => (
            <ForecastGroupCard key={`${group.productCode}-${group.customerCode}`} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== サブコンポーネント =====

function ForecastGroupCard({ group }: { group: ForecastGroup }) {
  const { productCode, productName, customerCode, customerName, unit, daily, dekad, monthly } =
    group;

  const [dekadState, setDekadState] = useState({
    value: dekad ? String(dekad.version_no ?? "") : "",
    isActive: dekad ? true : false,
  });

  const [monthlyState, setMonthlyState] = useState({
    value: monthly ? String(monthly.version_no ?? "") : "",
    isActive: monthly ? true : false,
  });

  return (
    <div className="space-y-4 rounded-lg border bg-white p-6">
      {/* ヘッダー */}
      <div className="border-b pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{productCode}</h3>
              <span className="text-sm text-gray-500">{productName}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
              <span>得意先: {customerName || customerCode}</span>
              <span className="text-gray-400">•</span>
              <span>単位: {unit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 粒度別データ */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Daily */}
        <div className="rounded border p-4">
          <div className="mb-2 text-xs font-medium text-gray-500 uppercase">Daily (日次)</div>
          {daily ? (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-600">バージョン: </span>
                <span className="font-semibold">v{daily.version_no}</span>
              </div>
              <div className="text-xs text-gray-500">
                更新日: {new Date(daily.updated_at).toLocaleDateString("ja-JP")}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">データなし</div>
          )}
        </div>

        {/* Dekad */}
        <div className="rounded border p-4">
          <div className="mb-2 text-xs font-medium text-gray-500 uppercase">Dekad (旬)</div>
          {dekad ? (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-600">バージョン: </span>
                <span className="font-semibold">v{dekad.version_no}</span>
              </div>
              <div className="text-xs text-gray-500">
                更新日: {new Date(dekad.updated_at).toLocaleDateString("ja-JP")}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={dekadState.value}
                  onChange={(e) => setDekadState({ ...dekadState, value: e.target.value })}
                  className="w-20 rounded border px-2 py-1 text-xs"
                  placeholder="v番号"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={dekadState.isActive}
                    onChange={(e) => setDekadState({ ...dekadState, isActive: e.target.checked })}
                  />
                  有効
                </label>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">データなし</div>
          )}
        </div>

        {/* Monthly */}
        <div className="rounded border p-4">
          <div className="mb-2 text-xs font-medium text-gray-500 uppercase">Monthly (月次)</div>
          {monthly ? (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-600">バージョン: </span>
                <span className="font-semibold">v{monthly.version_no}</span>
              </div>
              <div className="text-xs text-gray-500">
                更新日: {new Date(monthly.updated_at).toLocaleDateString("ja-JP")}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={monthlyState.value}
                  onChange={(e) => setMonthlyState({ ...monthlyState, value: e.target.value })}
                  className="w-20 rounded border px-2 py-1 text-xs"
                  placeholder="v番号"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={monthlyState.isActive}
                    onChange={(e) =>
                      setMonthlyState({ ...monthlyState, isActive: e.target.checked })
                    }
                  />
                  有効
                </label>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">データなし</div>
          )}
        </div>
      </div>
    </div>
  );
}
