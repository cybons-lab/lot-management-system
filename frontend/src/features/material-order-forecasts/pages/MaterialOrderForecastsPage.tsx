import { FileDown, Upload } from "lucide-react";
import { useState, useMemo } from "react";

import { type MaterialOrderForecast } from "../api";
import { ForecastFilterBar } from "../components/ForecastFilterBar";
import { ForecastImportDialog } from "../components/ForecastImportDialog";
import { ForecastTable } from "../components/ForecastTable";
import {
  useDeleteMaterialOrderForecast,
  useMaterialOrderForecasts,
} from "../hooks/useMaterialOrderForecasts";

import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMakers } from "@/features/makers/hooks/useMakers";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageHeader } from "@/shared/components/layout/PageHeader";

function PageActions({ onOpenImport }: { onOpenImport: () => void }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" disabled>
        <FileDown className="mr-2 h-4 w-4" />
        エクスポート
      </Button>
      <Button onClick={onOpenImport}>
        <Upload className="mr-2 h-4 w-4" />
        CSVインポート
      </Button>
    </div>
  );
}

function DeleteForecastDialog({
  target,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  target: MaterialOrderForecast | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={Boolean(target)}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="フォーキャストを削除しますか？"
      description={`対象年月 ${target?.target_month ?? "-"} / 材質コード ${target?.material_code ?? "-"} のデータを削除します。`}
      confirmLabel={isPending ? "削除中..." : "削除"}
    />
  );
}

export default function MaterialOrderForecastsPage() {
  const defaultMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [targetMonth, setTargetMonth] = useState(defaultMonth);
  const [makerCode, setMakerCode] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaterialOrderForecast | null>(null);

  const { data, isLoading, isError, error, refetch } = useMaterialOrderForecasts({
    target_month: targetMonth,
    maker_code: makerCode === "all" ? undefined : makerCode,
  });
  const deleteMutation = useDeleteMaterialOrderForecast();

  const { data: makers = [] } = useMakers();
  const displayTargetMonth = useMemo(
    () => `${targetMonth.slice(0, 4)}年${Number(targetMonth.slice(5, 7))}月`,
    [targetMonth],
  );

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
        actions={<PageActions onOpenImport={() => setIsImportOpen(true)} />}
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

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-900">
        現在表示中のデータ: <span className="font-semibold">{displayTargetMonth}</span>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <ForecastTable
          data={filteredForecasts}
          isLoading={isLoading}
          targetMonth={targetMonth}
          deletingId={deleteMutation.isPending ? deleteMutation.variables : null}
          onDelete={setDeleteTarget}
        />
      </div>

      <ForecastImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />

      <DeleteForecastDialog
        target={deleteTarget}
        isPending={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
