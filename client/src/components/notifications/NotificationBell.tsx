import { useState } from "react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useNotifications";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoading && <p className="px-4 py-6 text-center text-sm text-slate-400">Loading...</p>}
              {!isLoading && data?.notifications.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-slate-400">You're all caught up.</p>
              )}
              {data?.notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => !n.read && markRead.mutate(n._id)}
                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                    n.read ? "text-slate-500" : "bg-brand-50/50 font-medium text-slate-800"
                  }`}
                >
                  <p>{n.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
