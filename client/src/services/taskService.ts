import { api } from "./api";
import { Task, TaskPriority } from "@/types/task";

interface ListTasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

interface CreateTaskInput {
  columnId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignee?: string | null;
}

export const taskService = {
  async list(boardId: string, params: { limit?: number } = {}) {
    const { data } = await api.get<{ data: ListTasksResponse }>(`/boards/${boardId}/tasks`, {
      params: { limit: params.limit ?? 200 },
    });
    return data.data;
  },
  async create(boardId: string, input: CreateTaskInput) {
    const { data } = await api.post<{ data: { task: Task } }>(`/boards/${boardId}/tasks`, input);
    return data.data.task;
  },
  async update(taskId: string, updates: UpdateTaskInput) {
    const { data } = await api.patch<{ data: { task: Task } }>(`/tasks/${taskId}`, updates);
    return data.data.task;
  },
  async move(taskId: string, input: { columnId: string; position: number }) {
    const { data } = await api.patch<{ data: { task: Task } }>(`/tasks/${taskId}/move`, input);
    return data.data.task;
  },
  async remove(taskId: string) {
    await api.delete(`/tasks/${taskId}`);
  },
};
