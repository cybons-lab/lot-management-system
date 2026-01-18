import { Search, Loader2, Printer } from "lucide-react";

import {
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
} from "@/components/ui";

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
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
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
  );
}
