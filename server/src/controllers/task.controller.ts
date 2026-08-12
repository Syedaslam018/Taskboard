import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { taskService } from "../services/task.service";
import { TaskScopedRequest } from "../middleware/taskAccess";
import { BoardScopedRequest } from "../middleware/boardAccess";
import { TaskPriority } from "../models/Task";
import { getIO } from "../sockets/io";
import { workspaceRoom } from "../sockets/rooms";

export const taskController = {
  create: catchAsync(async (req: BoardScopedRequest, res) => {
    const { columnId, title, description, priority, assignee, labels, dueDate } = req.body;
    const task = await taskService.create({
      boardId: String(req.board!._id),
      columnId,
      title,
      description,
      priority,
      assignee,
      labels,
      dueDate,
      createdBy: req.userId as string,
    });

    getIO()?.to(workspaceRoom(String(req.workspace!._id))).emit("task:created", task);

    sendSuccess(res, { task }, "Task created successfully", 201);
  }),

  list: catchAsync(async (req: BoardScopedRequest, res) => {
    const { assignee, priority, columnId, label, search, page, limit } = req.query as Record<
      string,
      string | undefined
    >;
    const result = await taskService.list({
      boardId: String(req.board!._id),
      assignee,
      priority: priority as TaskPriority | undefined,
      columnId,
      label,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    sendSuccess(res, result, "Tasks retrieved");
  }),

  getOne: catchAsync(async (req: TaskScopedRequest, res) => {
    sendSuccess(res, { task: req.task }, "Task retrieved");
  }),

  update: catchAsync(async (req: TaskScopedRequest, res) => {
    const task = await taskService.update(req.task!, req.body);

    getIO()?.to(workspaceRoom(String(req.workspace!._id))).emit("task:updated", task);

    sendSuccess(res, { task }, "Task updated successfully");
  }),

  remove: catchAsync(async (req: TaskScopedRequest, res) => {
    const taskId = String(req.task!._id);
    const boardId = String(req.task!.boardId);
    await taskService.remove(req.task!);

    getIO()?.to(workspaceRoom(String(req.workspace!._id))).emit("task:deleted", { taskId, boardId });

    sendSuccess(res, null, "Task deleted successfully");
  }),

  move: catchAsync(async (req: TaskScopedRequest, res) => {
    const { columnId, position } = req.body;
    const task = await taskService.move(req.task!, columnId, position);

    getIO()?.to(workspaceRoom(String(req.workspace!._id))).emit("task:moved", task);

    sendSuccess(res, { task }, "Task moved successfully");
  }),
};
