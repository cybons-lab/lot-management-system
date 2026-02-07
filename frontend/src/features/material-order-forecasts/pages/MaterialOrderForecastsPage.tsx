import { FileDown, Upload } from "lucide-react";
import { useState, useMemo } from "react";

import { ForecastFilterBar } from "../components/ForecastFilterBar";
import { ForecastImportDialog } from "../components/ForecastImportDialog";
import { ForecastTable } from "../components/ForecastTable";
import {
  useDeleteMaterialOrderForecastsByMonth,
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

function DeleteMonthDialog({
  targetMonth,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  targetMonth: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="対象月データを削除しますか？"
      description={`対象年月 ${targetMonth} のフォーキャストをすべて削除します。`}
      confirmLabel={isPending ? "削除中..." : "削除"}
    />
  );
}

function TargetMonthBanner({
  displayTargetMonth,
  isDeleting,
  onDeleteClick,
}: {
  displayTargetMonth: string;
  isDeleting: boolean;
  onDeleteClick: () => void;
}) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-900">
      現在表示中のデータ: <span className="font-semibold">{displayTargetMonth}</span>
      <Button
        variant="destructive"
        size="sm"
        className="ml-4"
        onClick={onDeleteClick}
        disabled={isDeleting}
      >
        {displayTargetMonth}を全削除
      </Button>
    </div>
  );
}

export default function MaterialOrderForecastsPage() {
  const defaultMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [targetMonth, setTargetMonth] = useState(defaultMonth);
  const [makerCode, setMakerCode] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteMonthOpen, setIsDeleteMonthOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useMaterialOrderForecasts({
    target_month: targetMonth,
    ...(makerCode !== "all" ? { maker_code: makerCode } : {}),
  });
  const deleteMonthMutation = useDeleteMaterialOrderForecastsByMonth();

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
      (f) =>
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

      <TargetMonthBanner
        displayTargetMonth={displayTargetMonth}
        isDeleting={deleteMonthMutation.isPending}
        onDeleteClick={() => setIsDeleteMonthOpen(true)}
      />

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <ForecastTable data={filteredForecasts} isLoading={isLoading} targetMonth={targetMonth} />
      </div>

      <ForecastImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />

      {isDeleteMonthOpen && (
        <DeleteMonthDialog
          targetMonth={targetMonth}
          isPending={deleteMonthMutation.isPending}
          onOpenChange={setIsDeleteMonthOpen}
          onConfirm={() => {
            deleteMonthMutation.mutate(targetMonth, {
              onSuccess: () => setIsDeleteMonthOpen(false),
            });
          }}
        />
      )}
    </div>
  );
}
