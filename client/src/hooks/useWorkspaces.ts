import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceService } from "@/services/workspaceService";

export function useWorkspaces() {
  return useQuery({ queryKey: ["workspaces"], queryFn: workspaceService.list });
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspaceService.getOne(id),
    enabled: Boolean(id),
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      workspaceService.create(name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}
