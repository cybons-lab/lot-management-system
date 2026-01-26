import { ArrowDownToLine, FileSpreadsheet, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { type InventoryItem } from "@/features/inventory/api";

interface RowActionsProps {
  item: InventoryItem;
  onOpenQuickIntake: (item: InventoryItem) => void;
  onViewDetail: (productId: number, warehouseId: number) => void;
}

export function RowActions({ item, onOpenQuickIntake, onViewDetail }: RowActionsProps) {
  const navigate = useNavigate();

  const handleExcelView = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(ROUTES.INVENTORY.EXCEL_VIEW(item.product_id, item.warehouse_id));
  };

  if (item.inventory_state === "no_lots") {
    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(
              `/inventory/adhoc/new?product_id=${item.product_id}&warehouse_id=${item.warehouse_id}`,
            );
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          登録
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(item.product_id, item.warehouse_id);
          }}
        >
          詳細
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="font-medium text-emerald-700 hover:bg-emerald-50"
          onClick={handleExcelView}
          title="Excel風ビュー"
        >
          <FileSpreadsheet className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onOpenQuickIntake(item);
        }}
        title="ロット入庫"
      >
        <ArrowDownToLine className="mr-1 h-4 w-4" />
        入庫
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onViewDetail(item.product_id, item.warehouse_id);
        }}
      >
        詳細
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="font-medium text-emerald-700 hover:bg-emerald-50"
        onClick={handleExcelView}
        title="Excel風ビュー"
      >
        <FileSpreadsheet className="h-4 w-4" />
      </Button>
    </div>
  );
}
