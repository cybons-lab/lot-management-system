import { type Notification, type UnreadCountResponse } from "../types";

import { http } from "@/shared/api/http-client";

export const getNotifications = async (skip = 0, limit = 50): Promise<Notification[]> => {
  return await http.get<Notification[]>("notifications", {
    searchParams: { skip, limit },
  });
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  return await http.get<UnreadCountResponse>("notifications/unread-count");
};

export const markAsRead = async (notificationId: number): Promise<Notification> => {
  return await http.patch<Notification>(`notifications/${notificationId}/read`);
};

export const markAllAsRead = async (): Promise<UnreadCountResponse> => {
  return await http.post<UnreadCountResponse>("notifications/mark-all-read");
};

export interface CreateNotificationParams {
  user_id: number;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}

export const createNotification = async (
  params: CreateNotificationParams,
): Promise<Notification> => {
  return await http.post<Notification>("notifications", params);
};
