import { Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui";

interface CustomerDetailActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerDetailActions({ onEdit, onDelete }: CustomerDetailActionsProps) {
  return (
    <div className="flex justify-end gap-2 border-t pt-4">
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Edit className="mr-2 h-4 w-4" />
        編集
      </Button>
      <Button variant="destructive" size="sm" onClick={onDelete}>
        <Trash2 className="mr-2 h-4 w-4" />
        削除
      </Button>
    </div>
  );
}
