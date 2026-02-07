import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../api";
import { type Notification } from "../types";

interface NotificationCursor {
  createdAt: number;
  id: number;
}

const getNotificationCursor = (notification: Notification): NotificationCursor => {
  const createdAt = new Date(notification.created_at).getTime();
  return {
    createdAt: Number.isNaN(createdAt) ? 0 : createdAt,
    id: notification.id,
  };
};

const isNewerCursor = (candidate: NotificationCursor, reference: NotificationCursor) => {
  if (candidate.createdAt !== reference.createdAt) {
    return candidate.createdAt > reference.createdAt;
  }
  return candidate.id > reference.id;
};

const getLatestCursor = (notifications: Notification[]): NotificationCursor | null => {
  if (notifications.length === 0) return null;
  return notifications.reduce((latest, notification) => {
    const cursor = getNotificationCursor(notification);
    return isNewerCursor(cursor, latest) ? cursor : latest;
  }, getNotificationCursor(notifications[0]!));
};

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
  const lastProcessedCursorRef = useRef<NotificationCursor | null>(null);

  useEffect(() => {
    if (notifications.length === 0) return;

    const latestCursor = getLatestCursor(notifications);
    if (!latestCursor) return;

    // 初回読み込み時はIDを記録するだけ
    if (lastProcessedCursorRef.current === null) {
      lastProcessedCursorRef.current = latestCursor;
      return;
    }

    // 新着通知を全て取得
    // APIは created_at DESC (id DESCで安定化) を想定し、(created_at, id) で新着を判定する
    const newNotifications = notifications.filter((n) =>
      isNewerCursor(getNotificationCursor(n), lastProcessedCursorRef.current!),
    );

    if (newNotifications.length === 0) return;

    // 最新カーソルを更新
    lastProcessedCursorRef.current = latestCursor;

    // 古い順にソート（時系列順に表示）
    const sortedNew = [...newNotifications].sort((a, b) => {
      const aCursor = getNotificationCursor(a);
      const bCursor = getNotificationCursor(b);
      if (aCursor.createdAt !== bCursor.createdAt) {
        return aCursor.createdAt - bCursor.createdAt;
      }
      return aCursor.id - bCursor.id;
    });

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
      const latest = persistentNotifications[persistentNotifications.length - 1];
      if (latest) {
        new window.Notification(latest.title, {
          body: latest.message,
        });
      }
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
  // 通知設定ページの「ブラウザ通知を有効化」からユーザー操作で許可を取得する

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
