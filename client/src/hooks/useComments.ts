import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commentService } from "@/services/commentService";
import { getSocket } from "@/services/socket";

export function useComments(taskId: string | undefined) {
  const queryClient = useQueryClient();

  // The server emits comment:created to the workspace room, which the client
  // has already joined via useRealtimeBoard while a board is open. Refetch this
  // task's thread when a comment for it arrives (mirrors useNotifications).
  // Only comment:created is emitted server-side; edits/deletes reflect via the
  // mutating client's own invalidation.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !taskId) return;

    const onCommentCreated = (payload: { taskId: string }) => {
      if (payload.taskId !== taskId) return;
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    };

    socket.on("comment:created", onCommentCreated);
    return () => {
      socket.off("comment:created", onCommentCreated);
    };
  }, [taskId, queryClient]);

  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => commentService.listForTask(taskId as string),
    enabled: Boolean(taskId),
  });
}

export function useCreateComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => commentService.create(taskId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", taskId] }),
  });
}

export function useUpdateComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentService.update(commentId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", taskId] }),
  });
}

export function useDeleteComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentService.remove(commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", taskId] }),
  });
}
