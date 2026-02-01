import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../api";
// import { type Notification } from "../types";

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
    if (notifications.length > 0) {
      const latestNotification = notifications[0];

      // Initialize ref if first load
      if (lastProcessedIdRef.current === null) {
        lastProcessedIdRef.current = latestNotification.id;
        return;
      }

      // Check if there are new notifications
      if (latestNotification.id > lastProcessedIdRef.current) {
        // Show toast for the latest one
        toast(latestNotification.title, {
          description: latestNotification.message,
          action: latestNotification.link
            ? {
                label: "開く",
                onClick: () => (window.location.href = latestNotification.link!),
              }
            : undefined,
          duration: 5000,
        });

        // Request browser notification permission if needed
        if (window.Notification.permission === "granted") {
          new window.Notification(latestNotification.title, {
            body: latestNotification.message,
          });
        }

        lastProcessedIdRef.current = latestNotification.id;
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

  // Browser notification permission request
  useEffect(() => {
    if (window.Notification.permission === "default") {
      window.Notification.requestPermission();
    }
  }, []);

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
