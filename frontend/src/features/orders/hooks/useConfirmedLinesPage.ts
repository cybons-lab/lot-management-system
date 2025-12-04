/**
 * useConfirmedLinesPage - Custom hook for confirmed lines page logic.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useConfirmedOrderLines } from "@/hooks/useConfirmedOrderLines";
import { useSAPBatchRegistration } from "@/hooks/useSAPBatchRegistration";

export function useConfirmedLinesPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data: confirmedLines = [], isLoading, refetch } = useConfirmedOrderLines();
  const { registerToSAP, isRegistering } = useSAPBatchRegistration();

  const handleToggle = (lineId: number) => {
    setSelectedIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId],
    );
  };

  const handleToggleAll = () => {
    setSelectedIds(
      selectedIds.length === confirmedLines.length
        ? []
        : confirmedLines.map((line) => line.line_id),
    );
  };

  const handleRegister = () => {
    if (selectedIds.length === 0) {
      toast.error("登録する明細を選択してください");
      return;
    }

    registerToSAP(selectedIds, {
      onSuccess: (data) => {
        toast.success(`SAP登録完了: ${data.registered_count}件`);
        setSelectedIds([]);
        refetch();
      },
    });
  };

  const handleBack = () => {
    navigate("/orders");
  };

  return {
    confirmedLines,
    isLoading,
    selectedIds,
    isRegistering,
    handleToggle,
    handleToggleAll,
    handleRegister,
    handleBack,
    refetch,
  };
}
