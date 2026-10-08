import { api } from "@/core/api/client";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message?: string | null;
  booking_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export const getUserNotifications = async (
  userId: string
): Promise<Notification[]> => {
  const res = await api.get(`/notifications/user/${userId}`);
  return res.data;
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const res = await api.get(`/notifications/user/${userId}/unread-count`);
  return res.data.unread_count;
};

export const markAllNotificationsRead = async (
  userId: string
): Promise<void> => {
  await api.patch(`/notifications/user/${userId}/read-all`);
};

export const markNotificationRead = async (
  notificationId: string
): Promise<Notification> => {
  const res = await api.patch(`/notifications/${notificationId}/read`);
  return res.data;
};
