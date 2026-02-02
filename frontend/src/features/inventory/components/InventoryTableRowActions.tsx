import { ArrowDownToLine, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import { type InventoryItem } from "@/features/inventory/api";

interface RowActionsProps {
  item: InventoryItem;
  onOpenQuickIntake: (item: InventoryItem) => void;
  onViewDetail: (productId: number, warehouseId: number) => void;
}

export function RowActions({ item, onOpenQuickIntake, onViewDetail }: RowActionsProps) {
  const navigate = useNavigate();

  if (item.inventory_state === "no_lots") {
    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(
              `/inventory/adhoc/new?supplier_item_id=${item.supplier_item_id}&warehouse_id=${item.warehouse_id}`,
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
            onViewDetail(item.supplier_item_id, item.warehouse_id);
          }}
        >
          詳細
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
          onViewDetail(item.supplier_item_id, item.warehouse_id);
        }}
      >
        詳細
      </Button>
    </div>
  );
}
