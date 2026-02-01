/* eslint-disable max-lines-per-function */
import { Loader2, RefreshCw } from "lucide-react";

import { SmartReadUploadPanel } from "./SmartReadUploadPanel";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  TabsContent,
} from "@/components/ui";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportTabProps {
  selectedConfigId: number | null;
  isWatchFilesLoading: boolean;
  watchFiles: string[] | undefined;
  selectedWatchFiles: string[];
  isPending: boolean;
  isDiagnosing: boolean;
  canRunTest?: boolean;
  onToggleAll: () => void;
  toggleWatchFile: (f: string) => void;
  onProcessFiles: () => void;
  onDiagnose: () => void;
  onStartTest?: () => void;
  onRefetch: () => void;
  onAnalyzeSuccess: () => void;
}

export function SmartReadImportTab({
  selectedConfigId,
  isWatchFilesLoading,
  watchFiles,
  selectedWatchFiles,
  isPending,
  isDiagnosing,
  canRunTest,
  onToggleAll,
  toggleWatchFile,
  onProcessFiles,
  onDiagnose,
  onStartTest,
  onRefetch,
  onAnalyzeSuccess,
}: ImportTabProps) {
  return (
    <TabsContent value="import" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
      <div className="grid grid-cols-2 gap-4 h-full">
        <Card className="flex flex-col h-full">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">監視フォルダ</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRefetch}
                disabled={!selectedConfigId}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-0">
            {!selectedConfigId ? (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
                設定を選択してください
              </div>
            ) : isWatchFilesLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !watchFiles || watchFiles.length === 0 ? (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
                ファイルはありません
              </div>
            ) : (
              <>
                <div className="border-b px-4 py-2 bg-gray-50/50">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        watchFiles.length > 0 && selectedWatchFiles.length === watchFiles.length
                      }
                      onCheckedChange={onToggleAll}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      すべて選択
                    </label>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {watchFiles.map((file: string) => (
                      <WatchFileItem
                        key={file}
                        file={file}
                        isSelected={selectedWatchFiles.includes(file)}
                        onToggle={() => toggleWatchFile(file)}
                      />
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t space-y-2">
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={selectedWatchFiles.length === 0 || isPending}
                    onClick={onProcessFiles}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    選択ファイルを処理
                  </Button>
                  <Button
                    className="w-full"
                    size="sm"
                    variant="outline"
                    disabled={selectedWatchFiles.length === 0 || isDiagnosing}
                    onClick={onDiagnose}
                  >
                    {isDiagnosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    API診断（選択ファイル先頭）
                  </Button>
                  {canRunTest && onStartTest && (
                    <Button className="w-full" size="sm" variant="secondary" onClick={onStartTest}>
                      管理者テスト（監視フォルダ）
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="h-full">
          {!selectedConfigId ? (
            <Card className="h-full flex items-center justify-center text-gray-400">
              <p>設定を選択してください</p>
            </Card>
          ) : (
            <SmartReadUploadPanel configId={selectedConfigId} onAnalyzeSuccess={onAnalyzeSuccess} />
          )}
        </div>
      </div>
    </TabsContent>
  );
}

function WatchFileItem({
  file,
  isSelected,
  onToggle,
}: {
  file: string;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle())}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      <span className="text-sm truncate" title={file}>
        {file}
      </span>
    </div>
  );
}
