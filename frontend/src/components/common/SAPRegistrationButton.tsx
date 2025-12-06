import { Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge, Button } from "@/components/ui";
import { useConfirmedOrderLines } from "@/hooks/useConfirmedOrderLines";

export function SAPRegistrationButton() {
  const navigate = useNavigate();
  const { data: confirmedLines = [], isLoading } = useConfirmedOrderLines();

  const count = confirmedLines.length;

  if (isLoading) {
    return null;
  }

  return (
    <Button
      className="fixed right-4 bottom-4 z-30 gap-2 shadow-lg"
      onClick={() => navigate("/confirmed-lines")}
    >
      <Send className="h-4 w-4" />
      SAP受注登録
      {count > 0 && (
        <Badge variant="secondary" className="ml-1">
          {count}
        </Badge>
      )}
    </Button>
  );
}
