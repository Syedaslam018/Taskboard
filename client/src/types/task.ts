export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  _id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  assignee?: string;
  createdBy: string;
  labels: string[];
  dueDate?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}
