import { Droppable, Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { BoardColumn } from "@/types/board";
import { Task } from "@/types/task";
import TaskCard from "./TaskCard";
import { useCreateTask } from "@/hooks/useTasks";

interface Props {
  boardId: string;
  column: BoardColumn;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  // When a search/priority filter is active, `tasks` is a filtered subset
  // whose array indices don't correspond to real backend positions -
  // dragging in that state would send wrong position values. Simplest safe
  // answer: disable dragging while filtered, rather than risk corrupting
  // order. See BoardPage.tsx.
  dragDisabled?: boolean;
}

export default function KanbanColumn({ boardId, column, tasks, onSelectTask, dragDisabled }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const createTask = useCreateTask(boardId);

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

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-slate-700">{column.name}</h3>
        <span className="text-xs text-slate-400">{tasks.length}</span>
      </div>

      <Droppable droppableId={column._id} isDropDisabled={dragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[8px] flex-1 flex-col gap-2 rounded-lg p-1 transition-colors ${
              snapshot.isDraggingOver ? "bg-brand-50" : ""
            }`}
          >
            {tasks.map((task, index) =>
              dragDisabled ? (
                <TaskCard key={task._id} task={task} isDragging={false} onClick={() => onSelectTask(task)} />
              ) : (
                <Draggable draggableId={task._id} index={index} key={task._id}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                    >
                      <TaskCard task={task} isDragging={dragSnapshot.isDragging} onClick={() => onSelectTask(task)} />
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
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setTitle("");
              }}
              className="rounded-lg px-3 py-1 text-xs text-slate-500 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-200"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
