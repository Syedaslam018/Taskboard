import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/services/taskService";
import { TaskPriority } from "@/types/task";

export function useTasksQuery(boardId: string) {
  return useQuery({
    queryKey: ["tasks", boardId],
    queryFn: () => taskService.list(boardId, { limit: 200 }),
    enabled: Boolean(boardId),
  });
}

export function useCreateTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      columnId: string;
      title: string;
      description?: string;
      priority?: TaskPriority;
      dueDate?: string;
    }) => taskService.create(boardId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}

export function useUpdateTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: {
        title?: string;
        description?: string;
        priority?: TaskPriority;
        dueDate?: string | null;
        assignee?: string | null;
      };
    }) => taskService.update(taskId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}

export function useDeleteTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => taskService.remove(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}

/**
 * Fires the persistence call for a drag-and-drop move. The optimistic UI
 * update itself happens in BoardPage's local `columns` state - updated
 * synchronously in onDragEnd, before this mutation resolves - rather than
 * in the React Query cache. That local state is re-derived from this
 * query's data via a useEffect, so on error, simply invalidating here
 * forces a refetch that resyncs `columns` back to the server's truth: an
 * implicit rollback without duplicating the reorder logic in two places.
 */
export function useMoveTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; columnId: string; position: number }) =>
      taskService.move(input.taskId, { columnId: input.columnId, position: input.position }),
    onError: () => {
      qc.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });
}
