import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";
import { getSocket } from "@/services/socket";
import { AppNotification } from "@/types/notification";

export function useNotifications() {
  const queryClient = useQueryClient();

  // A notification can arrive for a workspace the user doesn't currently
  // have open (they're not in that board's Socket.io room), so this listens
  // on the personal user:{id} channel every socket auto-joins on connect,
  // rather than depending on useRealtimeBoard being mounted.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("notification:new", onNewNotification);
    return () => {
      socket.off("notification:new", onNewNotification);
    };
  }, [queryClient]);

  return useQuery({ queryKey: ["notifications"], queryFn: () => notificationService.list() });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData(["notifications"]);
      queryClient.setQueryData<
        { notifications: AppNotification[]; unreadCount: number } | undefined
      >(["notifications"], (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n) => (n._id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, old.unreadCount - 1),
        };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["notifications"], context.previous);
    },
  });
}
