import { Search, Loader2, Printer, Menu } from "lucide-react";
import { useState } from "react";

import {
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
} from "@/components/ui";
import { cn } from "@/shared/libs/utils";

interface LotFilterBarProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  selectedCount: number;
  onDownload: () => void;
  isDownloading: boolean;
  isLoading: boolean;
}

export function LotFilterBar({
  inputValue,
  onInputChange,
  status,
  onStatusChange,
  selectedCount,
  onDownload,
  isDownloading,
  isLoading,
}: LotFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      {/* ハンバーガーメニュートグル（小型画面用） */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-colors"
        aria-label="フィルタを表示/非表示"
      >
        <Menu className="h-5 w-5" />
        <span>フィルタ</span>
        <span className="text-xs text-gray-500">{isExpanded ? "（開く）" : "（閉じる）"}</span>
      </button>

      {/* フィルタコンテンツ */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-4",
          "lg:flex",
          !isExpanded && "hidden lg:flex",
        )}
      >
        <div className="relative min-w-[300px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="ロット番号、製品名、コードで検索..."
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            className="bg-white pl-9"
          />
        </div>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">在庫あり (Active)</SelectItem>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="depleted">在庫なし (Depleted)</SelectItem>
            <SelectItem value="expired">期限切れ</SelectItem>
            <SelectItem value="archived">アーカイブ済み</SelectItem>
          </SelectContent>
        </Select>

        {selectedCount > 0 && (
          <Button
            onClick={onDownload}
            disabled={isDownloading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            ラベル発行 ({selectedCount})
          </Button>
        )}

        {isLoading && <Loader2 className="text-primary h-5 w-5 animate-spin" />}
      </div>
    </div>
  );
}
