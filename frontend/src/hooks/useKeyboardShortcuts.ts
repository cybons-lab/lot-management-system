import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フォーム内では無効化
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // ? キーでヘルプ
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setShowHelp((prev) => !prev);
        return;
      }

      // Escキーでヘルプを閉じる
      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
        return;
      }

      // G キーからの連携 (Navigation)
      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setLastKey("g");
        // タイマーのリセット処理は複雑になるため、ここでは単純に次のキー入力で判定
        // ただし、長時間の待機を防ぐためにタイムアウトを設定すべきだが、
        // 今回はstate更新のみとし、useEffectの依存配列で管理
        return;
      }

      if (lastKey === "g") {
        switch (e.key.toLowerCase()) {
          case "h":
            navigate("/");
            break;
          case "i":
            navigate("/inventory");
            break;
          case "d":
            navigate("/dashboard");
            break;
          case "o":
            navigate("/orders");
            break;
        }
        setLastKey(null);
      } else {
        // g以外のキーが押されたらリセット（ただし修飾キーなしの場合）
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          // setLastKey(null); // 不要：lastKeyはgの時のみセットされる
        }
      }
    };

    // タイムアウト解除用
    let timeoutId: NodeJS.Timeout;
    if (lastKey === "g") {
      timeoutId = setTimeout(() => setLastKey(null), 1000);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [navigate, lastKey, showHelp]);

  return { showHelp, setShowHelp };
}
