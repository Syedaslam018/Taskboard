import { api } from "./api";
import { ActivityEntry } from "@/types/activity";

interface ListActivityResponse {
  activities: ActivityEntry[];
  total: number;
  page: number;
  limit: number;
}

export const activityService = {
  async listForWorkspace(workspaceId: string) {
    const { data } = await api.get<{ data: ListActivityResponse }>(
      `/workspaces/${workspaceId}/activity`,
      { params: { limit: 30 } }
    );
    return data.data;
  },
};
