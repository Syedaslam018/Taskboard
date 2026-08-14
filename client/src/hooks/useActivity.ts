import { useQuery } from "@tanstack/react-query";
import { activityService } from "@/services/activityService";

export function useActivityFeed(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["activity", workspaceId],
    queryFn: () => activityService.listForWorkspace(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}
