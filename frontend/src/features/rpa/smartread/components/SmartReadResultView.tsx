/* eslint-disable max-lines-per-function, complexity */

import { Loader2, Download, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

import {
  useCreateExport,
  useExportStatus,
  useExportCsvData,
  downloadJson,
  downloadCsv,
} from "../hooks";

import { SmartReadCsvTable } from "./SmartReadCsvTable";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";

interface SmartReadResultViewProps {
  configId: number;
  taskId: string;
}

export function SmartReadResultView({ configId, taskId }: SmartReadResultViewProps) {
  const [exportId, setExportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("long");

  const createExportMutation = useCreateExport();
  const { data: exportStatus } = useExportStatus(configId, taskId, exportId);

  const { data: csvResult, isLoading: isCsvLoading } = useExportCsvData(
    configId,
    taskId,
    exportId,
    exportStatus?.state === "DONE",
  );

  useEffect(() => {
    if (configId && taskId && !exportId) {
      console.log(`[ResultView] Initializing export for task ${taskId}...`);
      createExportMutation.mutate(
        { configId, taskId },
        {
          onSuccess: (data) => {
            console.log(`[ResultView] Export initialized. ID: ${data.export_id}`);
            setExportId(data.export_id);
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId, taskId]);

  useEffect(() => {
    if (csvResult) {
      const size = JSON.stringify(csvResult).length;
      console.log(`[ResultView] Data loaded. Size: ${(size / 1024).toFixed(2)} KB`);
      console.log(`[ResultView] Filename: ${csvResult.filename}`);
      console.log(`[ResultView] Long data rows: ${csvResult.long_data?.length ?? 0}`);
      console.log(`[ResultView] Wide data rows: ${csvResult.wide_data?.length ?? 0}`);
    }
  }, [csvResult]);

  const handleDownloadLong = () => {
    if (!csvResult?.long_data || !csvResult.filename) return;
    downloadCsv(csvResult.long_data, `${csvResult.filename}_long.csv`);
  };

  const handleDownloadWide = () => {
    if (!csvResult?.wide_data || !csvResult.filename) return;
    downloadCsv(csvResult.wide_data, `${csvResult.filename}_wide.csv`);
  };

  const handleDownloadJson = () => {
    // raw_dataがないためlong_dataを使用
    if (!csvResult?.long_data || !csvResult.filename) return;
    downloadJson(csvResult.long_data, `${csvResult.filename}.json`);
  };

  if (!exportId || !exportStatus || exportStatus.state === "RUNNING") {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>データを準備中...</p>
        </div>
      </Card>
    );
  }

  if (exportStatus.state === "FAILED") {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-red-500">
          <AlertCircle className="h-8 w-8" />
          <p>データ処理に失敗しました</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">処理結果</CardTitle>
            <CardDescription>
              {csvResult?.filename && <span>ファイル: {csvResult.filename}</span>}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadJson}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadWide}>
              <Download className="mr-2 h-4 w-4" />
              CSV(横)
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadLong}>
              <Download className="mr-2 h-4 w-4" />
              CSV(縦)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0 p-0">
        {isCsvLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="px-4 border-b">
              <TabsList>
                <TabsTrigger value="long">縦持ち (Long)</TabsTrigger>
                <TabsTrigger value="wide">横持ち (Wide)</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="long"
              className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
            >
              {csvResult?.long_data && (
                <SmartReadCsvTable data={csvResult.long_data} errors={csvResult.errors} />
              )}
            </TabsContent>
            <TabsContent
              value="wide"
              className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
            >
              {csvResult?.wide_data && (
                <SmartReadCsvTable data={csvResult.wide_data} errors={csvResult.errors} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
