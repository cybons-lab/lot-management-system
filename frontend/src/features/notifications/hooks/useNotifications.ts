import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../api";
// import { type Notification } from "../types";

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.mp3"); // Ensure this file exists or use a default browser sound logic if preferred
  }, []);

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(0, 50),
    refetchInterval: 30000, // 30 seconds polling
  });

  const { data: unreadCountData, refetch: refetchUnreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
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
