import { api } from "./api";
import { Comment } from "@/types/comment";

export const commentService = {
  async listForTask(taskId: string) {
    const { data } = await api.get<{ data: { comments: Comment[] } }>(`/tasks/${taskId}/comments`);
    return data.data.comments;
  },
  async create(taskId: string, content: string) {
    const { data } = await api.post<{ data: { comment: Comment } }>(`/tasks/${taskId}/comments`, { content });
    return data.data.comment;
  },
  async update(commentId: string, content: string) {
    const { data } = await api.patch<{ data: { comment: Comment } }>(`/comments/${commentId}`, { content });
    return data.data.comment;
  },
  async remove(commentId: string) {
    await api.delete(`/comments/${commentId}`);
  },
};
