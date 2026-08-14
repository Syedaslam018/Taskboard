import { useQuery } from "@tanstack/react-query";
import { workspaceService } from "@/services/workspaceService";

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceService.listMembers(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}
