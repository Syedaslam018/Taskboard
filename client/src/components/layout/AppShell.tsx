import { ReactNode } from "react";
import TopBar from "./TopBar";

interface Props {
  children: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  /**
   * When true, <main> spans the full width with no padding/max-width - for the
   * board's horizontally-scrolling kanban, which manages its own layout.
   * Otherwise content sits in a centered, padded container.
   */
  fluid?: boolean;
}

// Page skeleton for authenticated routes: the shared sticky TopBar over a
// <main> region. Standard pages get a centered max-width container; the board
// opts into `fluid` for a full-bleed canvas.
export default function AppShell({ children, breadcrumb, actions, fluid }: Props) {
  return (
    <div className="tb-app-shell flex min-h-screen flex-col">
      <TopBar breadcrumb={breadcrumb} actions={actions} />
      <main
        className={
          fluid ? "flex flex-1 flex-col overflow-hidden" : "mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}
