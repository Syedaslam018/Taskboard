import { Types } from "mongoose";
import { Board, IBoard, DEFAULT_COLUMNS } from "../models/Board";
import { Task } from "../models/Task";
import { AppError } from "../utils/AppError";

export const boardService = {
  async create(
    workspaceId: string,
    createdBy: string,
    name: string,
    description?: string,
    columnNames?: string[]
  ): Promise<IBoard> {
    const usingDefaults = !columnNames || columnNames.length === 0;
    const names = usingDefaults ? DEFAULT_COLUMNS : (columnNames as string[]);
    const columns = names.map((colName, index) => ({
      _id: new Types.ObjectId(),
      name: colName,
      order: index,
      // Only meaningful for the default column set, where "Done" is always
      // the last one. Custom column names have no reliable way to guess
      // which one means "done" - callers can mark one via updateColumn.
      isDone: usingDefaults && colName === "Done",
    }));

    return Board.create({
      workspaceId: new Types.ObjectId(workspaceId),
      name,
      description,
      columns,
      createdBy: new Types.ObjectId(createdBy),
    });
  },

  /** Lists boards for a workspace the caller already has confirmed access to. */
  async listForWorkspace(workspaceId: string) {
    return Board.find({ workspaceId: new Types.ObjectId(workspaceId) })
      .select("name description columns createdBy createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
  },

  async update(board: IBoard, updates: { name?: string; description?: string }): Promise<IBoard> {
    if (updates.name !== undefined) board.name = updates.name;
    if (updates.description !== undefined) board.description = updates.description;
    await board.save();
    return board;
  },

  async remove(board: IBoard): Promise<void> {
    // Cascade-delete tasks so the board doesn't leave orphaned rows behind -
    // one bulk delete rather than N individual deletes.
    await Task.deleteMany({ boardId: board._id });
    await board.deleteOne();
  },

  async addColumn(board: IBoard, name: string, isDone = false): Promise<IBoard> {
    const nextOrder = board.columns.length > 0 ? Math.max(...board.columns.map((c) => c.order)) + 1 : 0;
    board.columns.push({ _id: new Types.ObjectId(), name, order: nextOrder, isDone });
    await board.save();
    return board;
  },

  async updateColumn(
    board: IBoard,
    columnId: string,
    updates: { name?: string; isDone?: boolean }
  ): Promise<IBoard> {
    const column = board.columns.find((c) => c._id.toString() === columnId);
    if (!column) {
      throw AppError.notFound("Column not found on this board");
    }
    if (updates.name !== undefined) column.name = updates.name;
    if (updates.isDone !== undefined) column.isDone = updates.isDone;
    await board.save();
    return board;
  },

  async removeColumn(board: IBoard, columnId: string): Promise<IBoard> {
    const exists = board.columns.some((c) => c._id.toString() === columnId);
    if (!exists) {
      throw AppError.notFound("Column not found on this board");
    }
    const taskCount = await Task.countDocuments({ boardId: board._id, columnId });
    if (taskCount > 0) {
      throw AppError.badRequest("Move or delete all tasks in this column before deleting it");
    }
    board.columns = board.columns.filter((c) => c._id.toString() !== columnId);
    await board.save();
    return board;
  },
};
