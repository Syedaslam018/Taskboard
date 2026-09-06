import { Droppable, Draggable } from "@hello-pangea/dnd";
import { memo, useState } from "react";
import { BoardColumn } from "@/types/board";
import { Task } from "@/types/task";
import TaskCard from "./TaskCard";
import { useCreateTask } from "@/hooks/useTasks";
import { useUpdateColumn, useDeleteColumn } from "@/hooks/useColumns";
import { getErrorMessage } from "@/utils/getErrorMessage";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Props {
  boardId: string;
  column: BoardColumn;
  tasks: Task[];
  // Stable (useCallback'd in BoardPage) - passed straight through to
  // TaskCard with no wrapping arrow function, so its identity survives
  // across renders and React.memo on TaskCard can actually take effect.
  onSelectTask: (taskId: string) => void;
  // When a search/priority filter is active, `tasks` is a filtered subset
  // whose array indices don't correspond to real backend positions -
  // dragging in that state would send wrong position values. Simplest safe
  // answer: disable dragging while filtered, rather than risk corrupting
  // order. See BoardPage.tsx.
  dragDisabled?: boolean;
  // Gates the column management menu (rename / toggle done / delete). Column
  // mutations require ADMIN server-side, so non-admins never see the controls.
  canAdmin?: boolean;
}

function KanbanColumn({ boardId, column, tasks, onSelectTask, dragDisabled, canAdmin }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const createTask = useCreateTask(boardId);

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const updateColumn = useUpdateColumn(boardId);
  const deleteColumn = useDeleteColumn(boardId);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    setTitle("");
    setAdding(false);
    await createTask.mutateAsync({ columnId: column._id, title: trimmed });
  };

  const startRename = () => {
    setRenameValue(column.name);
    setRenaming(true);
    setMenuOpen(false);
  };

  const submitRename = async () => {
    const trimmed = renameValue.trim();
    setRenaming(false);
    if (!trimmed || trimmed === column.name) return;
    await updateColumn.mutateAsync({ columnId: column._id, updates: { name: trimmed } });
  };

  const toggleDone = async () => {
    setMenuOpen(false);
    await updateColumn.mutateAsync({ columnId: column._id, updates: { isDone: !column.isDone } });
  };

  const onConfirmDelete = async () => {
    setDeleteError(null);
    try {
      await deleteColumn.mutateAsync(column._id);
      setConfirmingDelete(false);
    } catch (err) {
      // Most common case: the server refuses to delete a non-empty column.
      setDeleteError(getErrorMessage(err, "Could not delete this column."));
    }
  };

  return (
    <div className="tb-board-column flex w-72 shrink-0 flex-col rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            maxLength={60}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitRename();
              }
              if (e.key === "Escape") setRenaming(false);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{column.name}</h3>
            {column.isDone && (
              <span className="tb-badge bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                Done
              </span>
            )}
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1">
                      <span className="rounded-md bg-white/60 px-1.5 py-0.5 text-xs font-semibold text-slate-400 dark:bg-black/10 dark:text-slate-500">{tasks.length}</span>
          {canAdmin && !renaming && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Column options"
                      className="tb-icon-button h-7 w-7"
              >
                <Icon name="more-horizontal" size={16} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="tb-menu absolute right-0 z-50 mt-1 w-44 origin-top-right animate-scale-in">
                    <button className="tb-menu-item" onClick={startRename}>
                      <Icon name="pencil" size={16} />
                      Rename
                    </button>
                    <button className="tb-menu-item" onClick={toggleDone}>
                      <Icon name="check-circle" size={16} />
                      {column.isDone ? "Mark as active" : "Mark as done"}
                    </button>
                    <button
                      className="tb-menu-item text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteError(null);
                        setConfirmingDelete(true);
                      }}
                    >
                      <Icon name="trash" size={16} />
                      Delete column
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Droppable droppableId={column._id} isDropDisabled={dragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[40px] flex-1 flex-col gap-2 rounded-lg p-1 transition-colors ${
              snapshot.isDraggingOver ? "bg-brand-50 dark:bg-brand-500/10" : ""
            }`}
          >
            {tasks.map((task, index) =>
              dragDisabled ? (
                <TaskCard key={task._id} task={task} isDragging={false} onSelect={onSelectTask} />
              ) : (
                <Draggable draggableId={task._id} index={index} key={task._id}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                    >
                      <TaskCard task={task} isDragging={dragSnapshot.isDragging} onSelect={onSelectTask} />
                    </div>
                  )}
                </Draggable>
              )
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {adding ? (
        <div className="mt-2 space-y-2">
          <textarea
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setTitle("");
              }
            }}
            placeholder="Task title..."
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <div className="flex gap-2">
            <button onClick={submit} className="tb-btn-primary px-3 py-1 text-xs">
              Add
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setTitle("");
              }}
              className="rounded-lg px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 transition hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <Icon name="plus" size={16} />
          Add task
        </button>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete column"
          danger
          confirmLabel="Delete"
          loading={deleteColumn.isPending}
          onConfirm={onConfirmDelete}
          onClose={() => setConfirmingDelete(false)}
          message={
            <>
              Delete the <span className="font-medium">&ldquo;{column.name}&rdquo;</span> column? This can&apos;t be
              undone.
              {deleteError && (
                <span className="mt-2 block font-medium text-red-600 dark:text-red-400">{deleteError}</span>
              )}
            </>
          }
        />
      )}
    </div>
  );
}

// `reorderColumns` (utils/reorder.ts) only replaces the array reference for
// the source and destination columns of a move - every other column keeps
// its original `tasks` array reference. Combined with a memoized component
// here, dragging a card from column A to column B skips re-rendering
// columns C, D, E entirely instead of re-rendering the whole board.
export default memo(KanbanColumn);
