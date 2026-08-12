import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { commentService } from "../services/comment.service";
import { TaskScopedRequest } from "../middleware/taskAccess";
import { CommentScopedRequest } from "../middleware/commentAccess";
import { getIO } from "../sockets/io";
import { workspaceRoom } from "../sockets/rooms";

export const commentController = {
  create: catchAsync(async (req: TaskScopedRequest, res) => {
    const comment = await commentService.create(String(req.task!._id), req.userId as string, req.body.content);

    getIO()
      ?.to(workspaceRoom(String(req.workspace!._id)))
      .emit("comment:created", { ...comment.toJSON(), taskId: String(req.task!._id) });

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
