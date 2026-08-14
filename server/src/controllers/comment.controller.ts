import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { commentService } from "../services/comment.service";
import { activityService } from "../services/activity.service";
import { notificationService } from "../services/notification.service";
import { ActivityType } from "../models/Activity";
import { NotificationType } from "../models/Notification";
import { TaskScopedRequest } from "../middleware/taskAccess";
import { CommentScopedRequest } from "../middleware/commentAccess";
import { getIO } from "../sockets/io";
import { workspaceRoom, userRoom } from "../sockets/rooms";

export const commentController = {
  create: catchAsync(async (req: TaskScopedRequest, res) => {
    const workspaceId = String(req.workspace!._id);
    const task = req.task!;

    const comment = await commentService.create(String(task._id), req.userId as string, req.body.content);

    getIO()
      ?.to(workspaceRoom(workspaceId))
      .emit("comment:created", { ...comment.toJSON(), taskId: String(task._id) });

    await activityService.record({
      workspaceId,
      actor: req.userId as string,
      type: ActivityType.COMMENT_ADDED,
      message: `${req.authUser!.name} commented on "${task.title}"`,
      metadata: { taskId: String(task._id) },
    });

    // Notify whoever the task is assigned to (falling back to its creator)
    // that someone commented - skip if that person is the commenter themselves.
    const recipient = task.assignee ? String(task.assignee) : String(task.createdBy);
    if (recipient !== req.userId) {
      const notification = await notificationService.create({
        userId: recipient,
        type: NotificationType.COMMENT_ADDED,
        message: `${req.authUser!.name} commented on "${task.title}"`,
        workspaceId,
        taskId: String(task._id),
      });
      getIO()?.to(userRoom(recipient)).emit("notification:new", notification);
    }

    sendSuccess(res, { comment }, "Comment added successfully", 201);
  }),

  list: catchAsync(async (req: TaskScopedRequest, res) => {
    const comments = await commentService.listForTask(String(req.task!._id));
    sendSuccess(res, { comments }, "Comments retrieved");
  }),

  update: catchAsync(async (req: CommentScopedRequest, res) => {
    const comment = await commentService.update(String(req.comment!._id), req.userId as string, req.body.content);
    sendSuccess(res, { comment }, "Comment updated successfully");
  }),

  remove: catchAsync(async (req: CommentScopedRequest, res) => {
    await commentService.remove(String(req.comment!._id), req.userId as string);
    sendSuccess(res, null, "Comment deleted successfully");
  }),
};
