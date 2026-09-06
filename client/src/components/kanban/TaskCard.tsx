import { memo } from "react";
import { Task } from "@/types/task";
import PriorityBadge from "./PriorityBadge";

interface Props {
  task: Task;
  isDragging: boolean;
  // Takes the task's id, not the task itself, and is expected to be a
  // stable (useCallback'd) reference from the parent - see KanbanColumn/
  // BoardPage. That's what lets React.memo below actually skip re-rendering
  // cards on a large board when an unrelated task changes: if this prop
  // were `() => onSelectTask(task)` defined inline in the parent's render,
  // it would be a new function identity every render regardless of memo.
  onSelect: (taskId: string) => void;
}

function TaskCard({ task, isDragging, onSelect }: Props) {
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;

  return (
    <div
      onClick={() => onSelect(task._id)}
      className={`tb-task-card cursor-pointer rounded-xl p-3 transition hover:-translate-y-0.5 hover:border-brand-400 ${
        isDragging ? "rotate-1 border-brand-400 shadow-md dark:border-brand-500" : ""
      }`}
    >
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span
            className={`text-xs ${
              isOverdue ? "font-medium text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {task.labels.map((label) => (
          <span
            key={label}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Only re-renders when this specific task's props actually change - moving
// or editing one card on a large board no longer re-renders every other
// card in every column, since `task` is a stable object reference for
// anything that didn't change (see BoardPage/reorderColumns) and `onSelect`
// is a stable callback (see KanbanColumn).
export default memo(TaskCard);
