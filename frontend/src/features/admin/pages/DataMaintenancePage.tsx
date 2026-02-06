/**
 * DataMaintenancePage - データ整合性チェック・修正ページ
 *
 * 全テーブルの NOT NULL 違反をスキャンし、定義済みルールで一括修正する。
 */
import { CheckCircle2, RefreshCw, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ViolationsTable } from "../components/ViolationsTable";

import { Button } from "@/components/ui";
import { http } from "@/shared/api/http-client";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

interface Violation {
  table_name: string;
  column_name: string;
  column_type: string;
  violation_count: number;
  sample_ids: (number | string)[];
  fixable: boolean;
  default_value: string | null;
  source: string;
}

interface ScanResponse {
  violations: Violation[];
  total_violations: number;
  total_affected_rows: number;
}

interface FixResponse {
  fixed: { table: string; column: string; rows_fixed: number; value_applied: string }[];
  total_rows_fixed: number;
}

export function DataMaintenancePage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const data = await http.get<ScanResponse>("admin/data-integrity");
      setViolations(data.violations);
      setScanned(true);
      if (data.violations.length === 0) {
        toast.success("違反は検出されませんでした");
      } else {
        toast.warning(`${data.total_violations}件の違反を検出（${data.total_affected_rows}行）`);
      }
    } catch {
      toast.error("スキャンに失敗しました");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFix = async (tableName?: string, columnName?: string) => {
    setIsFixing(true);
    try {
      const body =
        tableName && columnName ? { table_name: tableName, column_name: columnName } : {};
      const data = await http.post<FixResponse>("admin/data-integrity/fix", body);
      toast.success(`${data.total_rows_fixed}行を修正しました`);
      await handleScan();
    } catch {
      toast.error("修正に失敗しました");
    } finally {
      setIsFixing(false);
    }
  };

  const fixableCount = violations.filter((v) => v.fixable).length;

  return (
    <PageContainer>
      <PageHeader title="データ整合性メンテナンス" subtitle="NOT NULL制約違反の検出と修正" />

      <div className="mb-6 flex items-center gap-3">
        <Button onClick={handleScan} disabled={isScanning} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
          {isScanning ? "スキャン中..." : "スキャン実行"}
        </Button>
        {fixableCount > 0 && (
          <Button onClick={() => handleFix()} disabled={isFixing} variant="destructive">
            <Wrench className="mr-2 h-4 w-4" />
            {isFixing ? "修正中..." : `修正可能な${fixableCount}件を一括修正`}
          </Button>
        )}
      </div>

      {scanned && violations.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          <span>すべてのデータが正常です。違反は検出されませんでした。</span>
        </div>
      )}

      {violations.length > 0 && (
        <ViolationsTable violations={violations} isFixing={isFixing} onFix={handleFix} />
      )}

      {!scanned && (
        <div className="py-12 text-center text-muted-foreground">
          「スキャン実行」ボタンをクリックしてデータ整合性チェックを開始してください。
        </div>
      )}
    </PageContainer>
  );
}
