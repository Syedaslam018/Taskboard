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
    <header className="tb-topbar sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full items-center gap-3 px-4 sm:px-6">
        <Link
          to="/dashboard"
          className="flex shrink-0 items-center gap-2.5 transition hover:opacity-80"
        >
          <span className="tb-brand-mark inline-flex h-9 w-9 items-center justify-center rounded-xl">
            <Icon name="layout" size={18} strokeWidth={2.25} />
          </span>
          <span className="hidden text-sm font-bold tracking-tight sm:inline">TaskBoard</span>
        </Link>

        {breadcrumb && (
          <>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <div className="tb-breadcrumb min-w-0 flex-1 truncate">{breadcrumb}</div>
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
