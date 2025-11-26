import { Lock, MoreHorizontal, Pencil, Unlock } from "lucide-react";

import { Button } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";

interface LotActionCellProps {
  lot: LotUI;
  onEdit: (lot: LotUI) => void;
  onLock: (lot: LotUI) => void;
  onUnlock: (lot: LotUI) => void;
}

export function LotActionCell({ lot, onEdit, onLock, onUnlock }: LotActionCellProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">メニューを開く</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(lot)}>
          <Pencil className="mr-2 h-4 w-4" />
          編集
        </DropdownMenuItem>
        {lot.status === "locked" ? (
          <DropdownMenuItem onClick={() => onUnlock(lot)}>
            <Unlock className="mr-2 h-4 w-4" />
            ロック解除
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onLock(lot)} className="text-red-600">
            <Lock className="mr-2 h-4 w-4" />
            ロック
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
