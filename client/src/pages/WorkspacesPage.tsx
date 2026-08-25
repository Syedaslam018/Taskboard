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
        <h2 className="mb-5 text-xl font-semibold text-slate-900 dark:text-slate-100">Your workspaces</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : workspaces && workspaces.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <Link key={ws._id} to={`/workspaces/${ws._id}`} className="tb-card-interactive block p-4">
                <p className="font-medium text-slate-900 dark:text-slate-100">{ws.name}</p>
                {ws.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{ws.description}</p>
                )}
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
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
