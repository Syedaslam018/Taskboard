import { useActivityFeed } from "@/hooks/useActivity";
import { timeAgo } from "@/utils/timeAgo";
import Skeleton from "@/components/ui/Skeleton";

export default function ActivityFeed({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading } = useActivityFeed(workspaceId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (!data || data.activities.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">No activity yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {data.activities.map((entry) => (
        <li key={entry._id} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
          <div>
            <p className="text-slate-700 dark:text-slate-300">{entry.message}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(entry.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
