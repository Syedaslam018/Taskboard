import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useBoard } from "@/hooks/useBoards";
import { useTasksQuery, useMoveTask } from "@/hooks/useTasks";
import { Task } from "@/types/task";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import { reorderColumns } from "@/utils/reorder";
import TaskDetailModal from "@/components/kanban/TaskDetailModal";

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading: boardLoading } = useBoard(boardId!);
  const { data: tasksData, isLoading: tasksLoading } = useTasksQuery(boardId!);
  const moveTask = useMoveTask(boardId!);

  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
      </header>
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
                  tasks={columns[column._id] ?? []}
                  onSelectTask={setSelectedTask}
                />
              ))}
          </div>
        </DragDropContext>
      </main>
      {selectedTask && (
        <TaskDetailModal boardId={board._id} task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
