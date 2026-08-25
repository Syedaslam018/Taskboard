import { TaskPriority } from "@/types/task";

const STYLES: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export default function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`tb-badge ${STYLES[priority]}`}>{priority}</span>;
}
