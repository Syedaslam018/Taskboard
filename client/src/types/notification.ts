export type NotificationType = "TASK_ASSIGNED" | "TASK_MOVED" | "COMMENT_ADDED" | "MEMBER_ADDED";

export interface AppNotification {
  _id: string;
  user: string;
  type: NotificationType;
  message: string;
  workspaceId: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}
