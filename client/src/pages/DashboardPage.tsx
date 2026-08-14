import { Link } from "react-router-dom";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import NotificationBell from "@/components/notifications/NotificationBell";
import PriorityBadge from "@/components/kanban/PriorityBadge";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STAT_CARDS: Array<{ key: "total" | "inProgress" | "overdue" | "completed"; label: string }> = [
  { key: "total", label: "Total Tasks" },
  { key: "inProgress", label: "In Progress" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
];

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">TaskBoard</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => logout.mutate()}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {userLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <>
            <p className="text-sm text-slate-600">Welcome back,</p>
            <h2 className="text-2xl font-semibold text-slate-900">{user?.name}</h2>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STAT_CARDS.map(({ key, label }) => (
                <div key={key} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {dashboardLoading ? "—" : dashboard?.stats[key] ?? 0}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">My Tasks</h3>
                  {(dashboard?.stats.dueSoon ?? 0) > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {dashboard?.stats.dueSoon} due soon
                    </span>
                  )}
                </div>
                {dashboardLoading && <p className="text-sm text-slate-400">Loading...</p>}
                {!dashboardLoading && dashboard?.myTasks.length === 0 && (
                  <p className="text-sm text-slate-400">No tasks assigned to you yet.</p>
                )}
                <ul className="divide-y divide-slate-100">
                  {dashboard?.myTasks.map((task) => {
                    const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;
                    return (
                      <li key={task._id} className="flex items-center justify-between py-2.5">
                        <div className="min-w-0">
                          <Link
                            to={`/boards/${task.boardId}`}
                            className="truncate text-sm font-medium text-slate-800 hover:text-brand-600"
                          >
                            {task.title}
                          </Link>
                          {task.dueDate && (
                            <p className={`text-xs ${isOverdue ? "font-medium text-red-600" : "text-slate-400"}`}>
                              Due {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent Activity</h3>
                {dashboardLoading && <p className="text-sm text-slate-400">Loading...</p>}
                {!dashboardLoading && dashboard?.recentActivity.length === 0 && (
                  <p className="text-sm text-slate-400">No activity yet.</p>
                )}
                <ul className="space-y-3">
                  {dashboard?.recentActivity.map((entry) => (
                    <li key={entry._id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                      <div>
                        <p className="text-slate-700">{entry.message}</p>
                        <p className="text-xs text-slate-400">{timeAgo(entry.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-8 text-sm text-slate-400">
              <Link to="/workspaces" className="font-medium text-brand-600 hover:underline">
                Go to your workspaces &rarr;
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
