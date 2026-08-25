import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/services/socket";
import { Task } from "@/types/task";

interface TasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Joins the given workspace's Socket.io room while a board is open, and
 * applies incoming task/presence events directly to the React Query cache
 * for ["tasks", boardId]. BoardPage's own useEffect (which rebuilds the
 * per-column `columns` state from that same query data) then picks up the
 * change automatically - no separate merge logic needed here.
 */
export function useRealtimeBoard(boardId: string | undefined, workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!boardId || !workspaceId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit("workspace:join", workspaceId);

    const patchTasks = (updater: (tasks: Task[]) => Task[]) => {
      queryClient.setQueryData<TasksResponse | undefined>(["tasks", boardId], (old) => {
        if (!old) return old;
        return { ...old, tasks: updater(old.tasks) };
      });
    };

    const onTaskCreated = (task: Task) => {
      if (task.boardId !== boardId) return;
      patchTasks((tasks) => (tasks.some((t) => t._id === task._id) ? tasks : [...tasks, task]));
    };
    const onTaskUpdated = (task: Task) => {
      if (task.boardId !== boardId) return;
      patchTasks((tasks) => tasks.map((t) => (t._id === task._id ? task : t)));
    };
    // A move re-numbers the source/dest columns' siblings server-side (bulk
    // $inc), but task:moved only carries the single moved task. Patching just
    // that one leaves every observer with stale sibling positions -> wrong or
    // duplicated order. Invalidate instead so observers refetch the correct
    // ordering. (The mover already invalidates via useMoveTask's onSettled;
    // React Query dedupes the overlapping refetch.)
    const onTaskMoved = (task: Task) => {
      if (task.boardId !== boardId) return;
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    };
    const onTaskDeleted = (payload: { taskId: string; boardId: string }) => {
      if (payload.boardId !== boardId) return;
      patchTasks((tasks) => tasks.filter((t) => t._id !== payload.taskId));
    };
    const onPresence = (payload: { workspaceId: string; onlineUserIds: string[] }) => {
      if (payload.workspaceId !== workspaceId) return;
      setOnlineUserIds(payload.onlineUserIds);
    };

    socket.on("task:created", onTaskCreated);
    socket.on("task:updated", onTaskUpdated);
    socket.on("task:moved", onTaskMoved);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("user:online", onPresence);
    socket.on("user:offline", onPresence);

    return () => {
      socket.emit("workspace:leave", workspaceId);
      socket.off("task:created", onTaskCreated);
      socket.off("task:updated", onTaskUpdated);
      socket.off("task:moved", onTaskMoved);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("user:online", onPresence);
      socket.off("user:offline", onPresence);
    };
  }, [boardId, workspaceId, queryClient]);

  return { onlineUserIds };
}
