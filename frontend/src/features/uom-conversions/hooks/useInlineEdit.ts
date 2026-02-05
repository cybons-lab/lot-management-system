/**
 * Hook for inline editing UOM conversion factor.
 */
import { useState } from "react";
import { toast } from "sonner";

import type { UomConversionResponse } from "../api";

import { useUomConversions } from "./useUomConversions";

export function useInlineEdit() {
  const { useUpdate } = useUomConversions();
  const { mutate: updateConversion, isPending: isUpdating } = useUpdate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleStartEdit = (conversion: UomConversionResponse) => {
    setEditingId(conversion.conversion_id);
    setEditValue(String(conversion.conversion_factor));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSaveEdit = (conversion: UomConversionResponse) => {
    const factor = parseFloat(editValue);
    if (isNaN(factor) || factor <= 0) {
      toast.error("換算係数は正の数値を入力してください");
      return;
    }
    updateConversion(
      { id: conversion.conversion_id, data: { factor, version: conversion.version } },
      {
        onSuccess: () => {
          toast.success("換算係数を更新しました");
          setEditingId(null);
          setEditValue("");
        },
        onError: () => {
          toast.error("更新に失敗しました");
        },
      },
    );
  };

  return {
    editingId,
    editValue,
    setEditValue,
    isUpdating,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
  };
}
