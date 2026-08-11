import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { taskService } from "../services/task.service";
import { TaskScopedRequest } from "../middleware/taskAccess";
import { BoardScopedRequest } from "../middleware/boardAccess";
import { TaskPriority } from "../models/Task";

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
    sendSuccess(res, { task }, "Task updated successfully");
  }),

  remove: catchAsync(async (req: TaskScopedRequest, res) => {
    await taskService.remove(req.task!);
    sendSuccess(res, null, "Task deleted successfully");
  }),

  move: catchAsync(async (req: TaskScopedRequest, res) => {
    const { columnId, position } = req.body;
    const task = await taskService.move(req.task!, columnId, position);
    sendSuccess(res, { task }, "Task moved successfully");
  }),
};
