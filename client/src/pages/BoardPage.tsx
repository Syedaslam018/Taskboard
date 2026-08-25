import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useBoard } from "@/hooks/useBoards";
import { useTasksQuery, useMoveTask } from "@/hooks/useTasks";
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard";
import { useDebouncedValue } from "@/utils/useDebouncedValue";
import { Task, TaskPriority } from "@/types/task";
import { reorderColumns } from "@/utils/reorder";
import AppShell from "@/components/layout/AppShell";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import AddColumn from "@/components/kanban/AddColumn";
import BoardActionsMenu from "@/components/kanban/BoardActionsMenu";
import TaskDetailModal from "@/components/kanban/TaskDetailModal";
import Icon from "@/components/ui/Icon";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  // useBoard returns `{ board, role }` - the caller's workspace role rides
  // along so we can gate admin-only controls (column mgmt, board rename/delete)
  // and the comment composer without a second request.
  const { data, isLoading: boardLoading, isError, refetch } = useBoard(boardId!);
  const board = data?.board;
  const role = data?.role;
  const canAdmin = role === "OWNER" || role === "ADMIN";
  const canComment = Boolean(role) && role !== "VIEWER";

  const { data: tasksData, isLoading: tasksLoading } = useTasksQuery(boardId!);
  const moveTask = useMoveTask(boardId!);
  const { onlineUserIds } = useRealtimeBoard(boardId, board?.workspaceId);

  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  // Storing the id (not the whole Task) lets onSelectTask stay a trivial,
  // stable useCallback with no dependency on task data - which is what
  // lets TaskCard's React.memo actually skip re-renders. The full task
  // object is looked up from tasksData only when the modal needs to render.
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  const handleSelectTask = useCallback((taskId: string) => setSelectedTaskId(taskId), []);
  const selectedTask = tasksData?.tasks.find((t) => t._id === selectedTaskId) ?? null;

  // Resync local column state from the server whenever fresh data arrives
  // (initial load, after a create/edit/delete, or after a move settles).
  useEffect(() => {
    if (!board || !tasksData) return;
    const grouped: Record<string, Task[]> = {};
    for (const col of board.columns) grouped[col._id] = [];
    for (const task of tasksData.tasks) {
      if (!grouped[task.columnId]) grouped[task.columnId] = [];
      grouped[task.columnId].push(task);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key] = [...grouped[key]].sort((a, b) => a.position - b.position);
    }
    setColumns(grouped);
  }, [board, tasksData]);

  const isFiltering = Boolean(debouncedSearch.trim()) || Boolean(priorityFilter);

  // All board data is already loaded for drag-and-drop to work, so search
  // and priority filtering happen client-side against it (debounced to
  // avoid re-filtering on every keystroke on large boards) rather than a
  // fresh request per keystroke. See KanbanColumn for why dragging is
  // disabled while a filter narrows the visible set - a filtered subset's
  // array indices don't line up with real backend positions.
  const filteredColumns = useMemo(() => {
    if (!isFiltering) return columns;
    const term = debouncedSearch.trim().toLowerCase();
    const next: Record<string, Task[]> = {};
    for (const [columnId, tasks] of Object.entries(columns)) {
      next[columnId] = tasks.filter((task) => {
        const matchesTerm =
          !term ||
          task.title.toLowerCase().includes(term) ||
          (task.description ?? "").toLowerCase().includes(term);
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        return matchesTerm && matchesPriority;
      });
    }
    return next;
  }, [columns, isFiltering, debouncedSearch, priorityFilter]);

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic UI: reorder the local array immediately, before the
    // network request resolves, so the drag feels instant. If the request
    // fails, useMoveTask's onError invalidates the tasks query, which
    // re-runs the effect above and resyncs `columns` to the server's
    // authoritative order - an implicit rollback with no separate
    // "undo" code path to maintain.
    setColumns((prev) =>
      reorderColumns(prev, {
        sourceColumnId: source.droppableId,
        sourceIndex: source.index,
        destColumnId: destination.droppableId,
        destIndex: destination.index,
      })
    );

    moveTask.mutate({ taskId: draggableId, columnId: destination.droppableId, position: destination.index });
  }

  // --- Error ------------------------------------------------------------
  if (isError) {
    return (
      <AppShell fluid>
        <div className="mx-auto w-full max-w-md p-6">
          <ErrorState
            title="Couldn't load this board"
            description="The board may have been deleted, or you may not have access to it."
            onRetry={() => refetch()}
          />
          <div className="mt-4 text-center">
            <Link to="/workspaces" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
              Back to workspaces
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // --- Loading ----------------------------------------------------------
  if (boardLoading || tasksLoading || !board) {
    return (
      <AppShell fluid breadcrumb={<Skeleton className="h-4 w-40" />}>
        <div className="flex-1 overflow-hidden p-4 sm:p-6">
          <div className="flex gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-72 shrink-0 rounded-xl bg-slate-100 p-3 dark:bg-slate-800/50">
                <Skeleton className="mb-3 h-4 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const breadcrumb = (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <Link
        to={`/workspaces/${board.workspaceId}`}
        className="inline-flex shrink-0 items-center gap-1 text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <Icon name="arrow-left" size={16} />
        <span className="hidden sm:inline">Boards</span>
      </Link>
      <span className="shrink-0 text-slate-300 dark:text-slate-600">/</span>
      <span className="truncate font-medium text-slate-900 dark:text-slate-100">{board.name}</span>
    </div>
  );

  const sortedColumns = board.columns.slice().sort((a, b) => a.order - b.order);

  return (
    <AppShell fluid breadcrumb={breadcrumb} actions={canAdmin ? <BoardActionsMenu board={board} /> : undefined}>
      {/* Board sub-toolbar: presence + search/filter. Stacks on mobile. */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {onlineUserIds.length} online
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Icon name="search" size={16} />
            </span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tasks..."
              className="tb-input w-full pl-9 sm:w-56"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "")}
            className="tb-select w-full sm:w-40"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isFiltering && (
        <div className="shrink-0 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 sm:px-6">
          Filtering results — drag-and-drop is paused while a filter is active. Clear the search and priority filter to
          reorder tasks.
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {sortedColumns.length === 0 && !canAdmin ? (
          <EmptyState
            icon="layout"
            title="No columns yet"
            description="This board doesn't have any columns yet. An admin can add the first one."
          />
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full items-start gap-4">
              {sortedColumns.map((column) => (
                <KanbanColumn
                  key={column._id}
                  boardId={board._id}
                  column={column}
                  tasks={filteredColumns[column._id] ?? []}
                  onSelectTask={handleSelectTask}
                  dragDisabled={isFiltering}
                  canAdmin={canAdmin}
                />
              ))}
              {canAdmin && <AddColumn boardId={board._id} />}
            </div>
          </DragDropContext>
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal
          boardId={board._id}
          workspaceId={board.workspaceId}
          task={selectedTask}
          canAdmin={canAdmin}
          canComment={canComment}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </AppShell>
  );
}
