/**
 * AdjustmentCreatePage (v2.2 - Phase D-5)
 * Create new inventory adjustment
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { CreateAdjustmentRequest } from "../api";
import { AdjustmentForm } from "../components/AdjustmentForm";
import { useCreateAdjustment } from "../hooks";

import { ROUTES } from "@/constants/routes";

export function AdjustmentCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateAdjustment();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateAdjustmentRequest) => {
    setError(null);

    try {
      await createMutation.mutateAsync(data);
      // Success - redirect to list
      navigate(ROUTES.INVENTORY.ADJUSTMENTS.LIST);
    } catch (err) {
      console.error("Create adjustment failed:", err);
      setError("在庫調整の登録に失敗しました");
    }
  };

  const handleCancel = () => {
    navigate(ROUTES.INVENTORY.ADJUSTMENTS.LIST);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">在庫調整登録</h2>
        <p className="mt-1 text-gray-600">新しい在庫調整を登録します</p>
      </div>

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
    </div>
  );
}
