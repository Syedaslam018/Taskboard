import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boardService } from "@/services/boardService";

export function useBoardsForWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ["boards", workspaceId],
    queryFn: () => boardService.listForWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

// Returns `{ board, role }` - the caller's workspace role travels with the
// board so the UI can gate admin-only actions. Consumers read `data?.board`
// and `data?.role`.
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

export function useUpdateBoard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: { name?: string; description?: string }) => boardService.update(boardId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      // A rename must also refresh any workspace board list showing this board.
      qc.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

export function useDeleteBoard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => boardService.remove(boardId),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["board", boardId] });
      qc.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}
