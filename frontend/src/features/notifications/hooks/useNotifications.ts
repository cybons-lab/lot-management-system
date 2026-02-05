import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../api";
// import { type Notification } from "../types";

// eslint-disable-next-line max-lines-per-function -- 通知表示ロジックは論理的なまとまりとして1つのフックにあるべき
export function useNotifications() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // 開発環境では常に有効、本番環境でもViteプロキシ経由なので有効
  // Note: VITE_API_BASE_URLは本番ビルド時のみ使用される（静的ファイル配信時）
  // 開発環境ではViteプロキシ（/api）を使用するため、常に接続可能
  const notificationsEnabled = true;

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(0, 50),
    enabled: notificationsEnabled,
    refetchInterval: 30000, // 30 seconds polling
    retry: false,
  });

  const { data: unreadCountData, refetch: refetchUnreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    enabled: notificationsEnabled,
    refetchInterval: 30000,
    retry: false,
  });

  // Check for new notifications to show toast
  const lastProcessedIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (notifications.length === 0) return;

    // 初回読み込み時はIDを記録するだけ
    if (lastProcessedIdRef.current === null) {
      lastProcessedIdRef.current = notifications[0].id;
      return;
    }

    // 新着通知を全て取得
    // API契約の前提: GET /api/notifications は id DESC または created_at DESC でソート済み
    // → notifications[0] が最新、`id > lastProcessedId` で新着を検出可能
    const newNotifications = notifications.filter((n) => n.id > lastProcessedIdRef.current!);

    if (newNotifications.length === 0) return;

    // IDを更新（最新の通知ID）
    lastProcessedIdRef.current = notifications[0].id;

    // 古い順にソート（時系列順に表示）
    const sortedNew = [...newNotifications].reverse();

    // トースト表示対象をフィルタ（immediate または persistent のみ）
    const toastTargets = sortedNew.filter(
      (n) => n.display_strategy === "immediate" || n.display_strategy === "persistent",
    );

    // トースト表示（最大3件）
    const MAX_TOAST = 3;
    toastTargets.slice(0, MAX_TOAST).forEach((notification) => {
      toast(notification.title, {
        description: notification.message,
        action: notification.link
          ? {
              label: "開く",
              onClick: () => (window.location.href = notification.link!),
            }
          : undefined,
        duration: notification.display_strategy === "persistent" ? 8000 : 5000,
      });
    });

    // 残りがある場合は「他N件」をまとめ表示
    if (toastTargets.length > MAX_TOAST) {
      toast("新しい通知", {
        description: `他 ${toastTargets.length - MAX_TOAST} 件の通知があります`,
        action: {
          label: "確認",
          onClick: () => {
            setIsOpen(true);
          },
        },
        duration: 5000,
      });
    }

    // ブラウザ通知（条件: persistent かつ タブ非アクティブ時のみ）
    const persistentNotifications = sortedNew.filter((n) => n.display_strategy === "persistent");

    if (
      persistentNotifications.length > 0 &&
      document.visibilityState !== "visible" &&
      window.Notification?.permission === "granted"
    ) {
      // 最新1件のみブラウザ通知
      const latest = persistentNotifications[0];
      new window.Notification(latest.title, {
        body: latest.message,
      });
    }
  }, [notifications]);

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleMarkAsRead = (id: number) => {
    markReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllReadMutation.mutate();
  };

  // Note: ブラウザ通知の権限要求は自動的に行わない（UX配慮）
  // システム設定ページに「ブラウザ通知を有効化」ボタンを追加することを推奨

  return {
    notifications,
    unreadCount: unreadCountData?.count || 0,
    isOpen,
    setIsOpen,
    handleMarkAsRead,
    handleMarkAllAsRead,
    refetchNotifications,
    refetchUnreadCount,
  };
}
