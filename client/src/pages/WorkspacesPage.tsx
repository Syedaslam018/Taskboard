import { useState } from "react";
import { Link } from "react-router-dom";
import { useCreateWorkspace, useWorkspaces } from "@/hooks/useWorkspaces";

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:underline">
          &larr; Dashboard
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">Workspaces</h1>
        <div className="w-24" />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="space-y-3">
            {workspaces?.map((ws) => (
              <Link
                key={ws._id}
                to={`/workspaces/${ws._id}`}
                className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300"
              >
                <p className="font-medium text-slate-900">{ws.name}</p>
                {ws.description && <p className="mt-1 text-sm text-slate-500">{ws.description}</p>}
                <p className="mt-2 text-xs text-slate-400">
                  {ws.members.length} member{ws.members.length !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
            {workspaces?.length === 0 && (
              <p className="text-sm text-slate-500">No workspaces yet — create your first one below.</p>
            )}
          </div>
        )}

        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          {creating ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Workspace name"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <button
                onClick={submit}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="text-sm font-medium text-brand-600 hover:underline">
              + New workspace
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
