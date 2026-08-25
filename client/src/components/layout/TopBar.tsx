import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";
import UserMenu from "./UserMenu";

interface Props {
  /** Breadcrumb / page-context node shown after the brand (e.g. board name). */
  breadcrumb?: ReactNode;
  /** Page-specific action controls shown left of the theme/bell/user cluster. */
  actions?: ReactNode;
}

// Sticky top bar shared across all authenticated pages: brand on the left
// (with an optional breadcrumb), and a right cluster of page actions + theme
// toggle + notifications + account menu. The consistent shell is what makes
// the app feel like one product rather than a set of separate screens.
export default function TopBar({ breadcrumb, actions }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <Link
          to="/dashboard"
          className="flex shrink-0 items-center gap-2 text-slate-900 transition hover:opacity-80 dark:text-slate-100"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon name="layout" size={18} />
          </span>
          <span className="hidden text-sm font-semibold sm:inline">TaskBoard</span>
        </Link>

        {breadcrumb && (
          <>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <div className="min-w-0 flex-1 truncate">{breadcrumb}</div>
          </>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
