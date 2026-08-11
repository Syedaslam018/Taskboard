import { useCurrentUser, useLogout } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">TaskBoard</h1>
        <button
          onClick={() => logout.mutate()}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Log out
        </button>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <>
            <p className="text-sm text-slate-600">Welcome back,</p>
            <h2 className="text-2xl font-semibold text-slate-900">{user?.name}</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {["My Tasks", "Due Soon", "Overdue", "Completed"].map((label) => (
                <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">0</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-sm text-slate-400">
              Workspaces, boards, and tasks land in Phase 3–4 of the build.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
