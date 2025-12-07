/**
 * useDatabaseReset.ts
 * データベースリセット機能のカスタムフック
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";

import { resetDatabase } from "../api";

export function useDatabaseReset() {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      const result = await resetDatabase();
      toast.success("初期化完了", {
        description: result.message,
      });
      return true;
    } catch (error) {
      console.error("Database reset error:", error);
      toast.error("初期化失敗", {
        description: "データベースのリセットに失敗しました。",
      });
      return false;
    } finally {
      setIsResetting(false);
    }
  }, []);

  return {
    isResetting,
    handleReset,
  };
}
