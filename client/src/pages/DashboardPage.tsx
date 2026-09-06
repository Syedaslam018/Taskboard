import { Link } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { timeAgo } from "@/utils/timeAgo";
import AppShell from "@/components/layout/AppShell";
import Icon, { IconName } from "@/components/ui/Icon";
import Skeleton from "@/components/ui/Skeleton";
import PriorityBadge from "@/components/kanban/PriorityBadge";

type StatKey = "total" | "inProgress" | "overdue" | "completed";

const STAT_CARDS: Array<{ key: StatKey; label: string; icon: IconName; accent: string }> = [
  { key: "total", label: "Total Tasks", icon: "layout", accent: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300" },
  { key: "inProgress", label: "In Progress", icon: "clock", accent: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  { key: "overdue", label: "Overdue", icon: "alert-triangle", accent: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
  { key: "completed", label: "Completed", icon: "check-circle", accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
];

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();

  return (
    <AppShell breadcrumb={<span className="text-sm font-medium text-slate-700 dark:text-slate-200">Dashboard</span>}>
      <div className="animate-fade-in">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Overview</p>
        {userLoading ? (
          <Skeleton className="mt-1 h-8 w-48" />
        ) : (
          <h2 className="tb-page-heading mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Welcome back, {user?.name}
          </h2>
        )}
        <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
          Keep momentum across your workspaces, boards, and the tasks that need your attention.
        </p>

        {/* Compact metric strip */}
        <div className="tb-metric-strip mt-8">
          {STAT_CARDS.map(({ key, label, icon, accent }) => (
            <div key={key} className="tb-metric">
              <span className={`tb-metric-icon ${accent}`}>
                <Icon name={icon} size={22} />
              </span>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                {dashboardLoading ? (
                  <Skeleton className="mt-1 h-7 w-10" />
                ) : (
                  <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {dashboard?.stats[key] ?? 0}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* My tasks */}
          <div className="tb-card p-5 lg:col-span-2 sm:p-6">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Queue</p>
                <h3 className="tb-section-heading mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">My tasks</h3>
              </div>
              {(dashboard?.stats.dueSoon ?? 0) > 0 && (
                <span className="tb-badge bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  {dashboard?.stats.dueSoon} due soon
                </span>
              )}
            </div>
            {dashboardLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : dashboard && dashboard.myTasks.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {dashboard.myTasks.map((task) => {
                  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;
                  return (
                    <li key={task._id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link
                          to={`/boards/${task.boardId}`}
                          className="block truncate text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
                        >
                          {task.title}
                        </Link>
                        {task.dueDate && (
                          <p
                            className={`text-xs ${
                              isOverdue ? "font-medium text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <PriorityBadge priority={task.priority} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                No tasks assigned to you yet.
              </p>
            )}
          </div>

          {/* Recent activity */}
          <div className="tb-card p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Signal</p>
            <h3 className="tb-section-heading mb-4 mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Recent activity</h3>
            {dashboardLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : dashboard && dashboard.recentActivity.length > 0 ? (
              <ul className="space-y-3">
                {dashboard.recentActivity.map((entry) => (
                  <li key={entry._id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <div>
                      <p className="text-slate-700 dark:text-slate-300">{entry.message}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(entry.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No activity yet.</p>
            )}
          </div>
        </div>

        <p className="mt-8 text-sm">
          <Link to="/workspaces" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Go to your workspaces &rarr;
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
