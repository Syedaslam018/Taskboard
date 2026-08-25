import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspaces";
import { useBoardsForWorkspace, useCreateBoard } from "@/hooks/useBoards";
import AppShell from "@/components/layout/AppShell";
import ActivityFeed from "@/components/activity/ActivityFeed";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspace } = useWorkspace(workspaceId!);
  const { data: boards, isLoading } = useBoardsForWorkspace(workspaceId!);
  const createBoard = useCreateBoard(workspaceId!);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createBoard.mutateAsync({ name: trimmed });
    setName("");
    setCreating(false);
  };

  const newButton = (
    <button type="button" className="tb-btn-primary" onClick={() => setCreating(true)}>
      <Icon name="plus" size={16} />
      New board
    </button>
  );

  const breadcrumb = (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <Link to="/workspaces" className="shrink-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        Workspaces
      </Link>
      <span className="shrink-0 text-slate-300 dark:text-slate-600">/</span>
      <span className="truncate font-medium text-slate-700 dark:text-slate-200">{workspace?.name ?? "Workspace"}</span>
    </div>
  );

  return (
    <AppShell breadcrumb={breadcrumb} actions={newButton}>
      <div className="grid animate-fade-in grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Boards</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : boards && boards.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {boards.map((board) => (
                <Link key={board._id} to={`/boards/${board._id}`} className="tb-card-interactive block p-4">
                  <p className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <Icon name="layout" size={16} className="text-brand-500" />
                    {board.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {board.columns.length} column{board.columns.length !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="layout"
              title="No boards yet"
              description="Boards hold your columns and tasks. Create your first board to start planning."
              action={newButton}
            />
          )}
        </div>

        <aside className="tb-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Recent activity</h2>
          <ActivityFeed workspaceId={workspaceId!} />
        </aside>
      </div>

      {creating && (
        <Modal
          title="New board"
          size="sm"
          onClose={() => setCreating(false)}
          footer={
            <>
              <button type="button" className="tb-btn-secondary" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="tb-btn-primary"
                onClick={submit}
                disabled={createBoard.isPending || !name.trim()}
              >
                {createBoard.isPending && <Spinner size={16} />}
                Create
              </button>
            </>
          }
        >
          <label className="tb-label">Board name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Product Roadmap"
            className="tb-input"
          />
        </Modal>
      )}
    </AppShell>
  );
}
