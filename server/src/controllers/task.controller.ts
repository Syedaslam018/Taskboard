import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { taskService } from "../services/task.service";
import { TaskScopedRequest } from "../middleware/taskAccess";
import { BoardScopedRequest } from "../middleware/boardAccess";
import { TaskPriority } from "../models/Task";
import { activityService } from "../services/activity.service";
import { notificationService } from "../services/notification.service";
import { ActivityType } from "../models/Activity";
import { NotificationType } from "../models/Notification";
import { assertIsWorkspaceMember } from "../middleware/rbac";
import { getIO } from "../sockets/io";
import { workspaceRoom, userRoom } from "../sockets/rooms";

export const taskController = {
  create: catchAsync(async (req: BoardScopedRequest, res) => {
    const { columnId, title, description, priority, assignee, labels, dueDate } = req.body;
    const workspaceId = String(req.workspace!._id);

    if (assignee) {
      assertIsWorkspaceMember(req.workspace!, assignee);
    }

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

    await activityService.record({
      workspaceId,
      actor: req.userId as string,
      type: ActivityType.TASK_CREATED,
      message: `${req.authUser!.name} created "${task.title}"`,
      metadata: { taskId: String(task._id), boardId: String(req.board!._id) },
    });

    getIO()?.to(workspaceRoom(workspaceId)).emit("task:created", task);

    // Only notify if someone assigned the task to someone else at creation
    // time - assigning it to yourself isn't worth a notification.
    if (assignee && assignee !== req.userId) {
      const notification = await notificationService.create({
        userId: assignee,
        type: NotificationType.TASK_ASSIGNED,
        message: `${req.authUser!.name} assigned you "${task.title}"`,
        workspaceId,
        taskId: String(task._id),
      });
      getIO()?.to(userRoom(assignee)).emit("notification:new", notification);
    }

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
    const workspaceId = String(req.workspace!._id);
    const previousAssignee = req.task!.assignee ? String(req.task!.assignee) : undefined;

    if (req.body.assignee) {
      assertIsWorkspaceMember(req.workspace!, req.body.assignee);
    }

    const task = await taskService.update(req.task!, req.body);

    getIO()?.to(workspaceRoom(workspaceId)).emit("task:updated", task);

    // Notify only when the assignee actually *changed* to someone new -
    // avoids re-notifying on every unrelated edit (title, description, etc).
    const newAssignee = task.assignee ? String(task.assignee) : undefined;
    if (newAssignee && newAssignee !== previousAssignee && newAssignee !== req.userId) {
      const notification = await notificationService.create({
        userId: newAssignee,
        type: NotificationType.TASK_ASSIGNED,
        message: `${req.authUser!.name} assigned you "${task.title}"`,
        workspaceId,
        taskId: String(task._id),
      });
      getIO()?.to(userRoom(newAssignee)).emit("notification:new", notification);
    }

    sendSuccess(res, { task }, "Task updated successfully");
  }),

  remove: catchAsync(async (req: TaskScopedRequest, res) => {
    const taskId = String(req.task!._id);
    const boardId = String(req.task!.boardId);
    const workspaceId = String(req.workspace!._id);
    const title = req.task!.title;

    await taskService.remove(req.task!);

    await activityService.record({
      workspaceId,
      actor: req.userId as string,
      type: ActivityType.TASK_DELETED,
      message: `${req.authUser!.name} deleted "${title}"`,
      metadata: { taskId, boardId },
    });

    getIO()?.to(workspaceRoom(workspaceId)).emit("task:deleted", { taskId, boardId });

    sendSuccess(res, null, "Task deleted successfully");
  }),

  move: catchAsync(async (req: TaskScopedRequest, res) => {
    const { columnId, position } = req.body;
    const workspaceId = String(req.workspace!._id);
    const board = req.board!;
    const targetColumn = board.columns.find((c) => c._id.toString() === columnId);
    const assignee = req.task!.assignee ? String(req.task!.assignee) : undefined;

    const task = await taskService.move(req.task!, columnId, position);

    await activityService.record({
      workspaceId,
      actor: req.userId as string,
      type: ActivityType.TASK_MOVED,
      message: `${req.authUser!.name} moved "${task.title}" to ${targetColumn?.name ?? "a new column"}`,
      metadata: { taskId: String(task._id), boardId: String(board._id), columnId },
    });

    getIO()?.to(workspaceRoom(workspaceId)).emit("task:moved", task);

    // Notify the assignee their task moved, unless they're the one who moved it.
    if (assignee && assignee !== req.userId) {
      const notification = await notificationService.create({
        userId: assignee,
        type: NotificationType.TASK_MOVED,
        message: `${req.authUser!.name} moved your task "${task.title}" to ${targetColumn?.name ?? "a new column"}`,
        workspaceId,
        taskId: String(task._id),
      });
      getIO()?.to(userRoom(assignee)).emit("notification:new", notification);
    }

    sendSuccess(res, { task }, "Task moved successfully");
  }),
};
