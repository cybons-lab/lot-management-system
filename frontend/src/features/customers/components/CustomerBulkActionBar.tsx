import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui";

interface CustomerBulkActionBarProps {
  selectedCount: number;
  isAdmin: boolean;
  onOpenBulkDelete: () => void;
}

export function CustomerBulkActionBar({
  selectedCount,
  isAdmin,
  onOpenBulkDelete,
}: CustomerBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${
        isAdmin ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <span className={`text-sm font-medium ${isAdmin ? "text-red-800" : "text-amber-800"}`}>
        {selectedCount} 件選択中
      </span>
      <Button
        variant={isAdmin ? "destructive" : "outline"}
        size="sm"
        onClick={onOpenBulkDelete}
        className={!isAdmin ? "border-amber-600 text-amber-700 hover:bg-amber-100" : ""}
        data-testid={isAdmin ? "bulk-delete-button" : "bulk-inactivate-button"}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {isAdmin ? "一括削除" : "一括無効化"}
      </Button>
    </div>
  );
}
