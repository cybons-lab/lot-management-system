import { Loader2, AlertCircle } from "lucide-react";

import type { SmartReadConfig } from "../api";

import {
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui";

interface SmartReadConfigSelectorProps {
  configs: SmartReadConfig[] | undefined;
  isLoading: boolean;
  selectedConfigId: number | null;
  onSelect: (configId: number) => void;
}

export function SmartReadConfigSelector({
  configs,
  isLoading,
  selectedConfigId,
  onSelect,
}: SmartReadConfigSelectorProps) {
  const activeConfigs = configs?.filter((c) => c.is_active) ?? [];

  return (
    <Card className="shrink-0">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <label htmlFor="config-select" className="text-sm font-medium whitespace-nowrap">
            AI-OCR設定
          </label>
          <div className="flex-1">
            {isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                設定を読み込み中...
              </div>
            ) : activeConfigs.length === 0 ? (
              <Alert variant="default" className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">設定がありません</AlertTitle>
                <AlertDescription className="text-amber-700">
                  AI-OCR設定を追加してください。右上の「設定」ボタンから追加できます。
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={selectedConfigId?.toString() ?? ""}
                onValueChange={(value: string) => onSelect(Number(value))}
              >
                <SelectTrigger id="config-select">
                  <SelectValue placeholder="設定を選択" />
                </SelectTrigger>
                <SelectContent>
                  {activeConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
