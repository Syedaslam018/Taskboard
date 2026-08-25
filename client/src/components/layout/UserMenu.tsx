import { useState } from "react";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";

// Avatar button that opens a dropdown with the signed-in user's name/email and
// a Log out action. Logout clears the auth store, which makes ProtectedRoute
// redirect to /login - no explicit navigation needed here.
export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full p-0.5 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.name} src={user.avatar} size={32} />
      </button>

      {open && (
        <>
          {/* Click-catcher to dismiss on outside click (mirrors NotificationBell). */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="tb-menu absolute right-0 z-50 mt-2 w-56 animate-scale-in origin-top-right">
            <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 dark:border-slate-800">
              <Avatar name={user.name} src={user.avatar} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              className="tb-menu-item mt-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={() => {
                setOpen(false);
                logout.mutate();
              }}
              disabled={logout.isPending}
            >
              <Icon name="log-out" size={16} />
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
