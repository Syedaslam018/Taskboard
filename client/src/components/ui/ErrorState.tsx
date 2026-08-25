import { ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  title?: string;
  description?: ReactNode;
  /** When provided, renders a "Try again" button that calls it. */
  onRetry?: () => void;
  className?: string;
}

// Inline error panel with an optional retry action. Used for failed queries
// (e.g. a board that couldn't load) instead of leaving a blank screen.
export default function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
  className,
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-900/50 dark:bg-red-950/30 ${
        className ?? ""
      }`}
    >
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400">
        <Icon name="alert-triangle" size={24} />
      </span>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {onRetry && (
        <button type="button" className="tb-btn-secondary mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
