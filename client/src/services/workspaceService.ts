import { api } from "./api";
import { Workspace, WorkspaceMemberWithUser } from "@/types/workspace";

export const workspaceService = {
  async list() {
    const { data } = await api.get<{ data: { workspaces: Workspace[] } }>("/workspaces");
    return data.data.workspaces;
  },
  async create(name: string, description?: string) {
    const { data } = await api.post<{ data: { workspace: Workspace } }>("/workspaces", {
      name,
      description,
    });
    return data.data.workspace;
  },
  async getOne(id: string) {
    const { data } = await api.get<{ data: { workspace: Workspace } }>(`/workspaces/${id}`);
    return data.data.workspace;
  },
  async listMembers(id: string) {
    const { data } = await api.get<{ data: { members: WorkspaceMemberWithUser[] } }>(
      `/workspaces/${id}/members`
    );
    return data.data.members;
  },
};
