import { Types, FilterQuery } from "mongoose";
import { Task, ITask, TaskPriority } from "../models/Task";
import { Board } from "../models/Board";
import { AppError } from "../utils/AppError";

interface CreateTaskInput {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignee?: string;
  createdBy: string;
  labels?: string[];
  dueDate?: string;
}

interface ListTasksFilters {
  boardId: string;
  assignee?: string;
  priority?: TaskPriority;
  columnId?: string;
  label?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function assertColumnExists(columnIds: Set<string>, columnId: string): void {
  if (!columnIds.has(columnId)) {
    throw AppError.badRequest("That column does not exist on this board");
  }
}

export const taskService = {
  async create(input: CreateTaskInput): Promise<ITask> {
    const board = await Board.findById(input.boardId).select("columns").lean();
    if (!board) {
      throw AppError.notFound("Board not found");
    }
    const columnIds = new Set(board.columns.map((c) => c._id.toString()));
    assertColumnExists(columnIds, input.columnId);

    // Append to the end of the target column - avoids having to touch any
    // other task's position on create.
    const lastTask = await Task.findOne({ boardId: input.boardId, columnId: input.columnId })
      .sort({ position: -1 })
      .select("position")
      .lean();
    const position = lastTask ? lastTask.position + 1 : 0;

    return Task.create({
      boardId: new Types.ObjectId(input.boardId),
      columnId: new Types.ObjectId(input.columnId),
      title: input.title,
      description: input.description,
      priority: input.priority ?? TaskPriority.MEDIUM,
      assignee: input.assignee ? new Types.ObjectId(input.assignee) : undefined,
      createdBy: new Types.ObjectId(input.createdBy),
      labels: input.labels ?? [],
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      position,
    });
  },

  async list(filters: ListTasksFilters) {
    const query: FilterQuery<ITask> = { boardId: new Types.ObjectId(filters.boardId) };
    if (filters.assignee) query.assignee = new Types.ObjectId(filters.assignee);
    if (filters.priority) query.priority = filters.priority;
    if (filters.columnId) query.columnId = new Types.ObjectId(filters.columnId);
    if (filters.label) query.labels = filters.label;
    if (filters.search) {
      // Sanitize search input to prevent ReDoS attacks. Only allow safe characters
      // and limit length to prevent expensive regex patterns.
      const sanitized = filters.search.slice(0, 50).replace(/[^a-zA-Z0-9\s\-_]/g, "");
      if (sanitized.length >= 2) {
        query.$or = [
          { title: { $regex: sanitized, $options: "i" } },
          { description: { $regex: sanitized, $options: "i" } },
        ];
      }
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(query).sort({ columnId: 1, position: 1 }).skip(skip).limit(limit).lean(),
      Task.countDocuments(query),
    ]);

    return { tasks, total, page, limit };
  },

  async update(
    task: ITask,
    updates: {
      title?: string;
      description?: string;
      priority?: TaskPriority;
      assignee?: string | null;
      labels?: string[];
      dueDate?: string | null;
    }
  ): Promise<ITask> {
    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.assignee !== undefined) {
      task.assignee = updates.assignee ? new Types.ObjectId(updates.assignee) : undefined;
    }
    if (updates.labels !== undefined) task.labels = updates.labels;
    if (updates.dueDate !== undefined) {
      task.dueDate = updates.dueDate ? new Date(updates.dueDate) : undefined;
    }
    await task.save();
    return task;
  },

  async remove(task: ITask): Promise<void> {
    // Close the gap left behind so remaining tasks in the column stay
    // contiguously ordered (cheap: one updateMany, not a per-task rewrite).
    await Task.updateMany(
      { boardId: task.boardId, columnId: task.columnId, position: { $gt: task.position } },
      { $inc: { position: -1 } }
    );
    await task.deleteOne();
  },

  /**
   * Moves a task to a (possibly different) column and position. Uses two
   * bulk updateMany calls with $inc to shift only the tasks between the old
   * and new slot, rather than reading and rewriting every task in the
   * column - the "avoid inefficient database writes when reordering" goal
   * from the spec.
   */
  async move(task: ITask, targetColumnId: string, targetPosition: number): Promise<ITask> {
    const board = await Board.findById(task.boardId).select("columns").lean();
    if (!board) {
      throw AppError.notFound("Board not found");
    }
    const columnIds = new Set(board.columns.map((c) => c._id.toString()));
    assertColumnExists(columnIds, targetColumnId);

    const sourceColumnId = task.columnId.toString();
    const sourcePosition = task.position;
    const sameColumn = sourceColumnId === targetColumnId;

    if (sameColumn) {
      if (targetPosition === sourcePosition) {
        return task;
      }
      if (targetPosition > sourcePosition) {
        await Task.updateMany(
          {
            boardId: task.boardId,
            columnId: task.columnId,
            _id: { $ne: task._id },
            position: { $gt: sourcePosition, $lte: targetPosition },
          },
          { $inc: { position: -1 } }
        );
      } else {
        await Task.updateMany(
          {
            boardId: task.boardId,
            columnId: task.columnId,
            _id: { $ne: task._id },
            position: { $gte: targetPosition, $lt: sourcePosition },
          },
          { $inc: { position: 1 } }
        );
      }
      task.position = targetPosition;
    } else {
      // Close the gap in the source column.
      await Task.updateMany(
        { boardId: task.boardId, columnId: task.columnId, position: { $gt: sourcePosition } },
        { $inc: { position: -1 } }
      );
      // Open a slot in the target column.
      await Task.updateMany(
        { boardId: task.boardId, columnId: targetColumnId, position: { $gte: targetPosition } },
        { $inc: { position: 1 } }
      );
      task.columnId = new Types.ObjectId(targetColumnId);
      task.position = targetPosition;
    }

    await task.save();
    return task;
  },
};
