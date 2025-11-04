import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ForecastFileUploadCard } from "@/features/forecast/components/ForecastFileUploadCard";
import { getForecastList } from "@/features/forecast/api";
import { api } from "@/services/api";
import type { ForecastResponse } from "@/types/forecast";
import { formatCodeAndName } from "@/lib/utils";

type ForecastListResponse = Awaited<ReturnType<typeof getForecastList>>;
type ForecastSummaryItem = ForecastListResponse["items"][number];

type ForecastGroup = {
  productCode: string;
  productName?: string | null;
  customerCode: string;
  customerName?: string | null;
  unit?: string;
  daily?: ForecastSummaryItem;
  dekad?: ForecastSummaryItem;
  monthly?: ForecastSummaryItem;
};

type VersionOption = {
  value: string;
  label: string;
};

const DAY_COUNT = 31;

export default function ForecastListPage() {
  const [filters, setFilters] = useState({
    product_code: "",
    customer_code: "",
  });

  const forecastsQuery = useQuery({
    queryKey: ["forecast-list", filters],
    queryFn: () =>
      getForecastList({
        product_code: filters.product_code || undefined,
        supplier_code: undefined,
      }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, ForecastGroup>();
    const items = forecastsQuery.data?.items ?? [];

    items.forEach((item) => {
      const key = `${item.product_code}__${item.customer_code}`;
      const existing = map.get(key) ?? {
        productCode: item.product_code,
        productName: item.product_name,
        customerCode: item.customer_code,
        customerName: item.customer_name,
        unit: item.unit,
      };

      if (item.granularity === "daily") {
        existing.daily = item;
      } else if (item.granularity === "dekad") {
        existing.dekad = item;
      } else if (item.granularity === "monthly") {
        existing.monthly = item;
      }

      map.set(key, existing);
    });

    const result = Array.from(map.values());
    if (filters.customer_code) {
      const keyword = filters.customer_code.toLowerCase();
      return result.filter((group) =>
        group.customerCode.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [forecastsQuery.data, filters.customer_code]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Forecast 一覧</h2>
        <p className="text-muted-foreground">
          製品×得意先ごとの需要予測を日・旬・月の粒度で確認できます
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <ForecastFileUploadCard />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">製品コード</Label>
            <Input
              type="text"
              value={filters.product_code}
              onChange={(e) => setFilters({ ...filters, product_code: e.target.value })}
              placeholder="製品コードで絞り込み"
              className="w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">顧客コード</Label>
            <Input
              type="text"
              value={filters.customer_code}
              onChange={(e) => setFilters({ ...filters, customer_code: e.target.value })}
              placeholder="顧客コードで絞り込み"
              className="w-full px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {forecastsQuery.isLoading ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          フォーキャストを読み込み中...
        </div>
      ) : forecastsQuery.isError ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          データの取得に失敗しました
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          条件に一致するフォーキャストがありません
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <ForecastGroupCard key={`${group.productCode}-${group.customerCode}`} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function ForecastGroupCard({ group }: { group: ForecastGroup }) {
  const { productCode, productName, customerCode, customerName, unit, daily, dekad, monthly } = group;

  const [dekadState, setDekadState] = useState({
    value: dekad ? String(dekad.version_no ?? "") : "",
    data: normalizeDekadData(dekad?.dekad_data),
    isLoading: false,
    error: "" as string,
  });

  const [monthlyState, setMonthlyState] = useState({
    value: monthly ? String(monthly.version_no ?? "") : "",
    data: normalizeMonthlyData(monthly?.monthly_data),
    isLoading: false,
    error: "" as string,
  });

  const dekadOptions = buildVersionOptions(dekad);
  const monthlyOptions = buildVersionOptions(monthly);

  const handleDekadVersionChange = async (value: string) => {
    setDekadState((prev) => ({ ...prev, value }));
    if (!dekad) return;

    if (value === String(dekad.version_no ?? "")) {
      setDekadState({ value, data: normalizeDekadData(dekad.dekad_data), isLoading: false, error: "" });
      return;
    }

    setDekadState((prev) => ({ ...prev, isLoading: true, error: "" }));
    try {
      const versionNo = extractVersionNumber(value);
      const responses = await api.listForecasts({
        product_code: dekad.product_code,
        customer_code: dekad.customer_code,
        granularity: "dekad",
        ...(versionNo != null ? { version_no: versionNo } : {}),
      });
      setDekadState({
        value,
        data: buildDekadDataFromResponses(responses),
        isLoading: false,
        error: "",
      });
    } catch (error) {
      console.error("Failed to load dekad version", error);
      setDekadState((prev) => ({ ...prev, isLoading: false, error: "データの読み込みに失敗しました" }));
    }
  };

  const handleMonthlyVersionChange = async (value: string) => {
    setMonthlyState((prev) => ({ ...prev, value }));
    if (!monthly) return;

    if (value === String(monthly.version_no ?? "")) {
      setMonthlyState({ value, data: normalizeMonthlyData(monthly.monthly_data), isLoading: false, error: "" });
      return;
    }

    setMonthlyState((prev) => ({ ...prev, isLoading: true, error: "" }));
    try {
      const versionNo = extractVersionNumber(value);
      const responses = await api.listForecasts({
        product_code: monthly.product_code,
        customer_code: monthly.customer_code,
        granularity: "monthly",
        ...(versionNo != null ? { version_no: versionNo } : {}),
      });
      setMonthlyState({
        value,
        data: buildMonthlyDataFromResponses(responses),
        isLoading: false,
        error: "",
      });
    } catch (error) {
      console.error("Failed to load monthly version", error);
      setMonthlyState((prev) => ({ ...prev, isLoading: false, error: "データの読み込みに失敗しました" }));
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">
          {productCode}
          {productName ? <span className="ml-2 text-base text-gray-500">{productName}</span> : null}
        </h3>
        <div className="text-sm text-gray-500 mt-1">
          {formatCodeAndName(customerCode, customerName)}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">日別 (Daily)</h4>
          {daily?.updated_at && (
            <span className="text-xs text-gray-400">更新日: {new Date(daily.updated_at).toLocaleDateString()}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <DailyGrid data={daily?.daily_data ?? null} unit={unit ?? daily?.unit ?? "EA"} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">旬別 (Tenday)</h4>
          {dekadOptions.length > 0 && (
            <Select value={dekadState.value} onValueChange={handleDekadVersionChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="バージョンを選択" />
              </SelectTrigger>
              <SelectContent>
                {dekadOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {dekadState.isLoading ? (
          <div className="text-xs text-muted-foreground">旬別データを読み込み中...</div>
        ) : dekadState.error ? (
          <div className="text-xs text-destructive">{dekadState.error}</div>
        ) : (
          <TendayGrid data={dekadState.data} unit={unit ?? dekad?.unit ?? "EA"} />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">月別 (Monthly)</h4>
          {monthlyOptions.length > 0 && (
            <Select value={monthlyState.value} onValueChange={handleMonthlyVersionChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="バージョンを選択" />
              </SelectTrigger>
              <SelectContent>
                {monthlyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {monthlyState.isLoading ? (
          <div className="text-xs text-muted-foreground">月別データを読み込み中...</div>
        ) : monthlyState.error ? (
          <div className="text-xs text-destructive">{monthlyState.error}</div>
        ) : (
          <MonthlyGrid data={monthlyState.data} unit={unit ?? monthly?.unit ?? "EA"} />
        )}
      </section>
    </div>
  );
}

function DailyGrid({ data, unit }: { data: Record<string, number> | null; unit: string }) {
  const entries = useMemo(() => {
    const result: Array<{ key: string; value: number | null }> = [];
    for (let day = 1; day <= DAY_COUNT; day += 1) {
      const key = String(day);
      const padded = key.padStart(2, "0");
      const value = data?.[key] ?? data?.[padded] ?? null;
      result.push({ key, value });
    }
    return result;
  }, [data]);

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr>
          {entries.map((cell) => (
            <th key={`d-head-${cell.key}`} className="border px-1 py-1 text-center font-medium">
              {cell.key}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {entries.map((cell) => (
            <td key={`d-body-${cell.key}`} className="border px-1 py-1 text-center align-middle">
              {cell.value != null ? `${cell.value.toLocaleString()} ${unit}` : ""}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function TendayGrid({ data, unit }: { data: Record<string, number>; unit: string }) {
  const entries = Object.entries(data ?? {}).map(([label, value]) => ({
    label,
    value,
  }));

  if (entries.length === 0) {
    return <div className="text-xs text-muted-foreground">旬別データが存在しません</div>;
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr>
          {entries.map(({ label }) => (
            <th key={`t-head-${label}`} className="border px-2 py-1 text-center font-medium">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {entries.map(({ label, value }) => (
            <td key={`t-body-${label}`} className="border px-2 py-2 text-center align-middle">
              {value != null ? `${value.toLocaleString()} ${unit}` : ""}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function MonthlyGrid({ data, unit }: { data: Record<string, number>; unit: string }) {
  const entries = Object.entries(data ?? {}).map(([label, value]) => ({
    label,
    value,
  }));

  if (entries.length === 0) {
    return <div className="text-xs text-muted-foreground">月別データが存在しません</div>;
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr>
          {entries.map(({ label }) => (
            <th key={`m-head-${label}`} className="border px-3 py-1 text-center font-medium">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {entries.map(({ label, value }) => (
            <td key={`m-body-${label}`} className="border px-3 py-2 text-center align-middle">
              {value != null ? `${value.toLocaleString()} ${unit}` : ""}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function buildVersionOptions(item?: ForecastSummaryItem): VersionOption[] {
  if (!item) return [];
  const options: VersionOption[] = [];
  const currentValue = String(item.version_no ?? "");
  options.push({ value: currentValue, label: `v${item.version_no} (採用版)` });

  const history = Array.isArray(item.version_history) ? item.version_history : [];
  history.forEach((entry, index) => {
    const raw = (entry as { version_no?: unknown; label?: unknown }).version_no ?? (entry as { label?: unknown }).label ?? (entry as { value?: unknown }).value ?? `v${index + 1}`;
    const value = String(extractVersionNumber(raw) ?? raw);
    const label = typeof raw === "string" ? raw : `v${value}`;
    if (!options.some((opt) => opt.value === value)) {
      options.push({ value, label });
    }
  });

  return options;
}

function extractVersionNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const match = value.match(/\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isNaN(parsed) ? null : Math.floor(parsed);
    }
  }

  return null;
}

function normalizeDekadData(data?: Record<string, number> | null) {
  if (!data) return {};
  const mapping: Record<string, string> = {
    early: "上旬",
    middle: "中旬",
    late: "下旬",
  };
  const result: Record<string, number> = {};
  Object.entries(data).forEach(([key, value]) => {
    const label = mapping[key] ?? key;
    result[label] = Number(value ?? 0);
  });
  return result;
}

function normalizeMonthlyData(data?: Record<string, number> | null) {
  if (!data) return {};
  const result: Record<string, number> = {};
  Object.entries(data).forEach(([key, value]) => {
    const label = key.match(/^\d{4}-\d{2}$/)
      ? key
      : `${key}月`;
    result[label] = Number(value ?? 0);
  });
  return result;
}

function buildDekadDataFromResponses(responses: ForecastResponse[]) {
  const buckets: Record<string, number> = {};
  responses.forEach((item) => {
    if (!item.date_dekad_start) return;
    const date = new Date(item.date_dekad_start);
    if (Number.isNaN(date.getTime())) return;
    const monthLabel = `${date.getMonth() + 1}月`;
    const day = date.getDate();
    let bucketLabel = "上旬";
    if (day > 20) bucketLabel = "下旬";
    else if (day > 10) bucketLabel = "中旬";
    const label = `${monthLabel}${bucketLabel}`;
    buckets[label] = (buckets[label] ?? 0) + Number(item.qty_forecast ?? 0);
  });
  return buckets;
}

function buildMonthlyDataFromResponses(responses: ForecastResponse[]) {
  const summary: Record<string, number> = {};
  responses.forEach((item) => {
    const key = item.year_month ?? "";
    if (!key) return;
    summary[key] = (summary[key] ?? 0) + Number(item.qty_forecast ?? 0);
  });
  return normalizeMonthlyData(summary);
}
