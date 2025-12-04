/**
 * Hook for deleting UOM conversions with confirmation.
 */
import { useState } from "react";
import { toast } from "sonner";

import type { UomConversionResponse } from "../api";

import { useUomConversions } from "./useUomConversions";

export function useDeleteConversion() {
    const { useDelete } = useUomConversions();
    const { mutate: deleteConversion, isPending: isDeleting } = useDelete();
    const [deleteTarget, setDeleteTarget] = useState<UomConversionResponse | null>(null);

    const handleDelete = () => {
        if (!deleteTarget) return;
        deleteConversion(deleteTarget.conversion_id, {
            onSuccess: () => {
                toast.success("単位換算を削除しました");
                setDeleteTarget(null);
            },
            onError: () => {
                toast.error("削除に失敗しました");
            },
        });
    };

    return {
        deleteTarget,
        setDeleteTarget,
        isDeleting,
        handleDelete,
    };
}
