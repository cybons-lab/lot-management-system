export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
}
