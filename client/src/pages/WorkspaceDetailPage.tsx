import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspaces";
import { useBoardsForWorkspace, useCreateBoard } from "@/hooks/useBoards";
import NotificationBell from "@/components/notifications/NotificationBell";
import ActivityFeed from "@/components/activity/ActivityFeed";

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link to="/workspaces" className="text-sm font-medium text-slate-600 hover:underline">
          &larr; Workspaces
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">{workspace?.name ?? "Workspace"}</h1>
        <NotificationBell />
      </header>
      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading boards...</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {boards?.map((board) => (
                <Link
                  key={board._id}
                  to={`/boards/${board._id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300"
                >
                  <p className="font-medium text-slate-900">{board.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{board.columns.length} columns</p>
                </Link>
              ))}
              {boards?.length === 0 && (
                <p className="text-sm text-slate-500 sm:col-span-2">
                  No boards yet — create your first one below.
                </p>
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
                  placeholder="Board name"
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
              <button
                onClick={() => setCreating(true)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                + New board
              </button>
            )}
          </div>
        </div>

        <aside className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent activity</h2>
          <ActivityFeed workspaceId={workspaceId!} />
        </aside>
      </main>
    </div>
  );
}
