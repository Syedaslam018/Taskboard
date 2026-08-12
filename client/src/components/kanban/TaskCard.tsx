import { Task } from "@/types/task";
import PriorityBadge from "./PriorityBadge";

interface Props {
  task: Task;
  isDragging: boolean;
  onClick: () => void;
}

export default function TaskCard({ task, isDragging, onClick }: Props) {
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300 ${
        isDragging ? "rotate-1 shadow-md" : ""
      }`}
    >
      <p className="text-sm font-medium text-slate-800">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className={`text-xs ${isOverdue ? "font-medium text-red-600" : "text-slate-400"}`}>
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {task.labels.map((label) => (
          <span key={label} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
