import { ReactNode } from "react";
import Icon, { IconName } from "./Icon";

interface Props {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  /** Optional call-to-action (e.g. a "New board" button). */
  action?: ReactNode;
  className?: string;
}

// Friendly placeholder for "nothing here yet" states. Centered icon + title +
// optional description and CTA.
export default function EmptyState({ icon = "inbox", title, description, action, className }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700 ${
        className ?? ""
      }`}
    >
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
