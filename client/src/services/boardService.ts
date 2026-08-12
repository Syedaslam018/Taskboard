import { api } from "./api";
import { Board } from "@/types/board";

export const boardService = {
  async listForWorkspace(workspaceId: string) {
    const { data } = await api.get<{ data: { boards: Board[] } }>(`/workspaces/${workspaceId}/boards`);
    return data.data.boards;
  },
  async create(workspaceId: string, name: string, description?: string) {
    const { data } = await api.post<{ data: { board: Board } }>("/boards", {
      workspaceId,
      name,
      description,
    });
    return data.data.board;
  },
  async getOne(id: string) {
    const { data } = await api.get<{ data: { board: Board } }>(`/boards/${id}`);
    return data.data.board;
  },
};
