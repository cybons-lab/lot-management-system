/**
 * AdjustmentCreatePage (v2.2 - Phase D-5)
 * Create new inventory adjustment
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { CreateAdjustmentRequest } from "../api";
import { AdjustmentForm } from "../components/AdjustmentForm";
import { useCreateAdjustment } from "../hooks";

import { ROUTES } from "@/constants/routes";
import { PageContainer, PageHeader } from "@/shared/components/layout";

export function AdjustmentCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateAdjustment();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateAdjustmentRequest) => {
    setError(null);

    try {
      await createMutation.mutateAsync(data);
      toast.success("在庫調整を登録しました");
      navigate(ROUTES.INVENTORY.ADJUSTMENTS.LIST);
    } catch (err) {
      console.error("Create adjustment failed:", err);
      const message = "在庫調整の登録に失敗しました";
      setError(message);
      toast.error(message);
    }
  };

  const handleCancel = () => {
    navigate(ROUTES.INVENTORY.ADJUSTMENTS.LIST);
  };

  return (
    <PageContainer>
      <PageHeader title="在庫調整登録" subtitle="新しい在庫調整を登録します" className="pb-0" />

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">{error}</div>
      )}

      {/* Form */}
      <div className="rounded-lg border bg-white p-6">
        <AdjustmentForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </PageContainer>
  );
}
