import { FileDown, Upload } from "lucide-react";
import { useState, useMemo } from "react";

import { type MaterialOrderForecast } from "../api";
import { ForecastFilterBar } from "../components/ForecastFilterBar";
import { ForecastImportDialog } from "../components/ForecastImportDialog";
import { ForecastTable } from "../components/ForecastTable";
import { useMaterialOrderForecasts } from "../hooks/useMaterialOrderForecasts";

import { Button } from "@/components/ui";
import { useMakers } from "@/features/makers/hooks/useMakers";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export default function MaterialOrderForecastsPage() {
  const defaultMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [targetMonth, setTargetMonth] = useState(defaultMonth);
  const [makerCode, setMakerCode] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useMaterialOrderForecasts({
    target_month: targetMonth,
    maker_code: makerCode === "all" ? undefined : makerCode,
  });

  const { data: makers = [] } = useMakers();

  const filteredForecasts = useMemo(() => {
    const forecasts = data?.items ?? [];
    if (!searchQuery.trim()) return forecasts;
    const q = searchQuery.toLowerCase();
    return forecasts.filter(
      (f: MaterialOrderForecast) =>
        (f.material_code ?? "").toLowerCase().includes(q) ||
        (f.material_name ?? "").toLowerCase().includes(q),
    );
  }, [data?.items, searchQuery]);

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        <PageHeader title="材料発注フォーキャスト" subtitle="内示データの閲覧とインポート" />
        <QueryErrorFallback error={error} resetError={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="材料発注フォーキャスト"
        subtitle="内示データの閲覧とインポート"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              <FileDown className="mr-2 h-4 w-4" />
              エクスポート
            </Button>
            <Button onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              CSVインポート
            </Button>
          </div>
        }
      />

      <ForecastFilterBar
        targetMonth={targetMonth}
        setTargetMonth={setTargetMonth}
        makerCode={makerCode}
        setMakerCode={setMakerCode}
        makers={makers}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <ForecastTable data={filteredForecasts} isLoading={isLoading} targetMonth={targetMonth} />
      </div>

      <ForecastImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        defaultMonth={targetMonth}
      />
    </div>
  );
}
