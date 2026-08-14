import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useBoard } from "@/hooks/useBoards";
import { useTasksQuery, useMoveTask } from "@/hooks/useTasks";
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard";
import { useDebouncedValue } from "@/utils/useDebouncedValue";
import { Task, TaskPriority } from "@/types/task";
import { reorderColumns } from "@/utils/reorder";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import TaskDetailModal from "@/components/kanban/TaskDetailModal";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading: boardLoading } = useBoard(boardId!);
  const { data: tasksData, isLoading: tasksLoading } = useTasksQuery(boardId!);
  const moveTask = useMoveTask(boardId!);
  const { onlineUserIds } = useRealtimeBoard(boardId, board?.workspaceId);

  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const debouncedSearch = useDebouncedValue(searchInput, 250);

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

  if (boardLoading || tasksLoading || !board) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading board...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <Link to="/workspaces" className="text-xs font-medium text-brand-600 hover:underline">
            &larr; Workspaces
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">{board.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tasks..."
            className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "")}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {onlineUserIds.length} online
          </div>
        </div>
      </header>
      {isFiltering && (
        <div className="border-b border-amber-100 bg-amber-50 px-6 py-2 text-xs text-amber-700">
          Filtering results — drag-and-drop is paused while a filter is active. Clear the search and priority
          filter to reorder tasks.
        </div>
      )}
      <main className="overflow-x-auto px-6 py-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4">
            {board.columns
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((column) => (
                <KanbanColumn
                  key={column._id}
                  boardId={board._id}
                  column={column}
                  tasks={filteredColumns[column._id] ?? []}
                  onSelectTask={setSelectedTask}
                  dragDisabled={isFiltering}
                />
              ))}
          </div>
        </DragDropContext>
      </main>
      {selectedTask && (
        <TaskDetailModal
          boardId={board._id}
          workspaceId={board.workspaceId}
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
