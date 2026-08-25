import { useState } from "react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useNotifications";
import { timeAgo } from "@/utils/timeAgo";
import Icon from "@/components/ui/Icon";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Notifications"
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="tb-menu absolute right-0 z-50 mt-2 w-80 animate-scale-in origin-top-right p-0">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
            </div>
            <div className="max-h-96 overflow-y-auto p-1">
              {isLoading && (
                <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
              )}
              {!isLoading && data?.notifications.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  You're all caught up.
                </p>
              )}
              {data?.notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => !n.read && markRead.mutate(n._id)}
                  className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    n.read
                      ? "text-slate-500 dark:text-slate-400"
                      : "bg-brand-50/60 font-medium text-slate-800 dark:bg-brand-500/10 dark:text-slate-100"
                  }`}
                >
                  <p>{n.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{timeAgo(n.createdAt)}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
