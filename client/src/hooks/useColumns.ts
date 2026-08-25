import { useMutation, useQueryClient } from "@tanstack/react-query";
import { boardService } from "@/services/boardService";

// Column mutations all return the updated board and are ADMIN-gated server-side.
// They mutate the board document (not tasks), so we invalidate ["board", id].
// Note: deleting a non-empty column is rejected by the server with a clear
// message ("Move or delete all tasks..."); callers surface mutation.error.
export function useAddColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; isDone?: boolean }) => boardService.addColumn(boardId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useUpdateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, updates }: { columnId: string; updates: { name?: string; isDone?: boolean } }) =>
      boardService.updateColumn(boardId, columnId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useDeleteColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnId: string) => boardService.deleteColumn(boardId, columnId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}
