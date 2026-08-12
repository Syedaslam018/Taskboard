import { Types } from "mongoose";
import { Comment, IComment } from "../models/Comment";
import { AppError } from "../utils/AppError";

export const commentService = {
  async create(taskId: string, author: string, content: string): Promise<IComment> {
    const comment = await Comment.create({
      taskId: new Types.ObjectId(taskId),
      author: new Types.ObjectId(author),
      content,
    });
    return comment.populate("author", "name avatar");
  },

  async listForTask(taskId: string) {
    return Comment.find({ taskId: new Types.ObjectId(taskId) })
      .sort({ createdAt: 1 })
      .populate("author", "name avatar")
      .lean();
  },

  /** Editing is restricted to the comment's own author, checked here (not RBAC). */
  async update(commentId: string, requesterId: string, content: string): Promise<IComment> {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw AppError.notFound("Comment not found");
    }
    if (comment.author.toString() !== requesterId) {
      throw AppError.forbidden("You can only edit your own comments");
    }
    comment.content = content;
    await comment.save();
    return comment.populate("author", "name avatar");
  },

  async remove(commentId: string, requesterId: string): Promise<void> {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw AppError.notFound("Comment not found");
    }
    if (comment.author.toString() !== requesterId) {
      throw AppError.forbidden("You can only delete your own comments");
    }
    await comment.deleteOne();
  },
};
