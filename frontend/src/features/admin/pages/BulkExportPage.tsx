/**
 * BulkExportPage
 * 一括エクスポートダウンロードページ
 */

import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Database } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getExportTargets, downloadBulkExport, type ExportTarget } from "../api/bulk-export";

import { Button } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form";
import { Label } from "@/components/ui/form";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// --- Sub-components ---

function ExportTargetList({
  targets,
  selectedTargets,
  onToggle,
  onSelectAll,
}: {
  targets: ExportTarget[];
  selectedTargets: string[];
  onToggle: (key: string) => void;
  onSelectAll: () => void;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          エクスポート対象
        </CardTitle>
        <CardDescription>ダウンロードするデータを選択してください</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 全選択 */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedTargets.length === targets.length && targets.length > 0}
              onCheckedChange={onSelectAll}
            />
            <Label htmlFor="select-all" className="cursor-pointer font-medium">
              すべて選択
            </Label>
          </div>
          <span className="text-muted-foreground text-sm">
            {selectedTargets.length} / {targets.length} 選択中
          </span>
        </div>

        {/* ターゲットリスト */}
        <div className="space-y-2">
          {targets.map((target) => (
            <div
              key={target.key}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3"
            >
              <Checkbox
                id={target.key}
                checked={selectedTargets.includes(target.key)}
                onCheckedChange={() => onToggle(target.key)}
              />
              <Label htmlFor={target.key} className="flex-1 cursor-pointer">
                <div className="font-medium">{target.name}</div>
                <div className="text-muted-foreground text-sm">{target.description}</div>
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DownloadSettings({
  format,
  onFormatChange,
  selectedCount,
  isDownloading,
  onDownload,
}: {
  format: "xlsx" | "csv";
  onFormatChange: (format: "xlsx" | "csv") => void;
  selectedCount: number;
  isDownloading: boolean;
  onDownload: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ダウンロード設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 形式選択 */}
        <div className="space-y-2">
          <Label htmlFor="format-select">ファイル形式</Label>
          <Select value={format} onValueChange={(v) => onFormatChange(v as "xlsx" | "csv")}>
            <SelectTrigger id="format-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              <SelectItem value="csv">CSV (.csv)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ダウンロードボタン */}
        <Button
          className="w-full"
          onClick={onDownload}
          disabled={selectedCount === 0 || isDownloading}
        >
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ダウンロード中...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              ZIPダウンロード
            </>
          )}
        </Button>

        <p className="text-muted-foreground text-xs">
          選択した {selectedCount} 件のデータを {format.toUpperCase()} 形式で
          ZIPファイルにまとめてダウンロードします。
        </p>
      </CardContent>
    </Card>
  );
}

// --- Main Component ---

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
export function BulkExportPage() {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    data: targets = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["bulk-export-targets"],
    queryFn: getExportTargets,
  });

  const handleToggle = (key: string) => {
    setSelectedTargets((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSelectAll = () => {
    if (selectedTargets.length === targets.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(targets.map((t) => t.key));
    }
  };

  const handleDownload = async () => {
    if (selectedTargets.length === 0) {
      toast.error("エクスポート対象を選択してください");
      return;
    }

    setIsDownloading(true);
    try {
      await downloadBulkExport(selectedTargets, format);
      toast.success("ダウンロードを開始しました");
    } catch (err) {
      toast.error("ダウンロードに失敗しました");
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="一括エクスポート" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <PageHeader title="一括エクスポート" />
        <QueryErrorFallback error={error} resetError={refetch} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="一括エクスポート"
        subtitle="複数のマスタデータを選択してZIPファイルでダウンロードします"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <ExportTargetList
          targets={targets}
          selectedTargets={selectedTargets}
          onToggle={handleToggle}
          onSelectAll={handleSelectAll}
        />
        <DownloadSettings
          format={format}
          onFormatChange={setFormat}
          selectedCount={selectedTargets.length}
          isDownloading={isDownloading}
          onDownload={handleDownload}
        />
      </div>
    </PageContainer>
  );
}
