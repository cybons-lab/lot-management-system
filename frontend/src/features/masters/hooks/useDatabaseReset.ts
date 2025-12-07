/**
 * useDatabaseReset - データベースリセット機能のカスタムフック
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { resetDatabase } from "../api";

export function useDatabaseReset() {
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDatabase = useCallback(async () => {
    setIsResetting(true);
    try {
      const response = await resetDatabase();
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message || "リセットに失敗しました");
      }
      return response.success;
    } catch (error) {
      const message = error instanceof Error ? error.message : "データベースリセット中にエラーが発生しました";
      toast.error(message);
      return false;
    } finally {
      setIsResetting(false);
    }
  }, []);

  return {
    isResetting,
    handleResetDatabase,
  };
}
