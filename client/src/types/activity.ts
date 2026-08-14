export type ActivityType =
  | "TASK_CREATED"
  | "TASK_MOVED"
  | "TASK_DELETED"
  | "COMMENT_ADDED"
  | "MEMBER_ADDED"
  | "BOARD_CREATED";

export interface ActivityEntry {
  _id: string;
  workspaceId: string;
  actor: string;
  type: ActivityType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
