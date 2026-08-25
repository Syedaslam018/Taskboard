import { useState } from "react";
import { useAddColumn } from "@/hooks/useColumns";
import { getErrorMessage } from "@/utils/getErrorMessage";
import Icon from "@/components/ui/Icon";

// Trailing "add column" control that lives at the end of the kanban row.
// Only rendered for admins (see BoardPage). Collapses to a dashed button and
// expands into an inline name input, mirroring the "Add task" affordance.
export default function AddColumn({ boardId }: { boardId: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addColumn = useAddColumn(boardId);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    setError(null);
    try {
      await addColumn.mutateAsync({ name: trimmed });
      setName("");
      setAdding(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not add the column."));
    }
  };

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-72 shrink-0 items-center gap-1.5 self-start rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-600 dark:hover:text-brand-400"
      >
        <Icon name="plus" size={16} />
        Add column
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 self-start rounded-xl bg-slate-100 p-3 dark:bg-slate-800/50">
      <input
        autoFocus
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setAdding(false);
            setName("");
            setError(null);
          }
        }}
        placeholder="Column name..."
        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
      />
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={submit}
          disabled={addColumn.isPending || !name.trim()}
          className="tb-btn-primary px-3 py-1 text-xs"
        >
          Add
        </button>
        <button
          onClick={() => {
            setAdding(false);
            setName("");
            setError(null);
          }}
          className="rounded-lg px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
