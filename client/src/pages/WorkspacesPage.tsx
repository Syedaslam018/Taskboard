import { useState } from "react";
import { Link } from "react-router-dom";
import { useCreateWorkspace, useWorkspaces } from "@/hooks/useWorkspaces";
import AppShell from "@/components/layout/AppShell";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

export default function WorkspacesPage() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createWorkspace.mutateAsync({ name: trimmed });
    setName("");
    setCreating(false);
  };

  const newButton = (
    <button type="button" className="tb-btn-primary" onClick={() => setCreating(true)}>
      <Icon name="plus" size={16} />
      New workspace
    </button>
  );

  return (
    <AppShell
      breadcrumb={<span className="text-sm font-medium text-slate-700 dark:text-slate-200">Workspaces</span>}
      actions={newButton}
    >
      <div className="animate-fade-in">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Workspace index</p>
          <h2 className="tb-page-heading mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Your workspaces</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">A focused home for every team, project, and board.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : workspaces && workspaces.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <Link key={ws._id} to={`/workspaces/${ws._id}`} className="tb-card-interactive group block p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                    <Icon name="layout" size={17} />
                  </span>
                  <Icon name="chevron-right" size={17} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
                </div>
                <p className="mt-5 font-semibold text-slate-900 dark:text-slate-100">{ws.name}</p>
                {ws.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{ws.description}</p>
                )}
                <p className="mt-5 flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                  <Icon name="users" size={14} />
                  {ws.members.length} member{ws.members.length !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="layout"
            title="No workspaces yet"
            description="Workspaces group your boards and teammates. Create your first one to get started."
            action={newButton}
          />
        )}
      </div>

      {creating && (
        <Modal
          title="New workspace"
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
                disabled={createWorkspace.isPending || !name.trim()}
              >
                {createWorkspace.isPending && <Spinner size={16} />}
                Create
              </button>
            </>
          }
        >
          <label className="tb-label">Workspace name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Marketing Team"
            className="tb-input"
          />
        </Modal>
      )}
    </AppShell>
  );
}
