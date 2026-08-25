import { api } from "./api";
import { Board } from "@/types/board";
import { WorkspaceRole } from "@/types/workspace";

// The board detail endpoint returns the caller's role alongside the board so
// the UI can gate admin-only actions (column CRUD, rename/delete) without a
// second request.
export interface BoardWithRole {
  board: Board;
  role: WorkspaceRole;
}

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
  async getOne(id: string): Promise<BoardWithRole> {
    const { data } = await api.get<{ data: BoardWithRole }>(`/boards/${id}`);
    return data.data;
  },
  async update(id: string, updates: { name?: string; description?: string }) {
    const { data } = await api.patch<{ data: { board: Board } }>(`/boards/${id}`, updates);
    return data.data.board;
  },
  async remove(id: string) {
    await api.delete(`/boards/${id}`);
  },

  // ---- Columns (all ADMIN-gated server-side; each returns the full board) ----
  async addColumn(boardId: string, input: { name: string; isDone?: boolean }) {
    const { data } = await api.post<{ data: { board: Board } }>(`/boards/${boardId}/columns`, input);
    return data.data.board;
  },
  async updateColumn(boardId: string, columnId: string, updates: { name?: string; isDone?: boolean }) {
    const { data } = await api.patch<{ data: { board: Board } }>(`/boards/${boardId}/columns/${columnId}`, updates);
    return data.data.board;
  },
  async deleteColumn(boardId: string, columnId: string) {
    const { data } = await api.delete<{ data: { board: Board } }>(`/boards/${boardId}/columns/${columnId}`);
    return data.data.board;
  },
};
