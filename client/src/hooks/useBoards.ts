import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boardService } from "@/services/boardService";

export function useBoardsForWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ["boards", workspaceId],
    queryFn: () => boardService.listForWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => boardService.getOne(boardId),
    enabled: Boolean(boardId),
  });
}

export function useCreateBoard(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      boardService.create(workspaceId, name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards", workspaceId] }),
  });
}
