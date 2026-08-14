import { api } from "./api";
import { AppNotification } from "@/types/notification";

interface ListNotificationsResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export const notificationService = {
  async list(unreadOnly = false) {
    const { data } = await api.get<{ data: ListNotificationsResponse }>("/notifications", {
      params: { unread: unreadOnly, limit: 30 },
    });
    return data.data;
  },
  async markRead(id: string) {
    const { data } = await api.patch<{ data: { notification: AppNotification } }>(
      `/notifications/${id}/read`
    );
    return data.data.notification;
  },
};
