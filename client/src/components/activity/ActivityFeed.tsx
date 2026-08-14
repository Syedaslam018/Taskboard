import { useActivityFeed } from "@/hooks/useActivity";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ActivityFeed({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading } = useActivityFeed(workspaceId);

  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading activity...</p>;
  }
  if (!data || data.activities.length === 0) {
    return <p className="text-sm text-slate-400">No activity yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {data.activities.map((entry) => (
        <li key={entry._id} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
          <div>
            <p className="text-slate-700">{entry.message}</p>
            <p className="text-xs text-slate-400">{timeAgo(entry.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
