import { NextFunction, Response } from "express";
import { Types } from "mongoose";
import { AppError } from "../utils/AppError";
import { Comment, IComment } from "../models/Comment";
import { Task, ITask } from "../models/Task";
import { Board, IBoard } from "../models/Board";
import { WorkspaceRole, IWorkspace } from "../models/Workspace";
import { assertWorkspaceAccess } from "./rbac";
import { AuthenticatedRequest } from "./auth";

export interface CommentScopedRequest extends AuthenticatedRequest {
  comment?: IComment;
  task?: ITask;
  board?: IBoard;
  workspace?: IWorkspace;
  membershipRole?: WorkspaceRole;
}

/**
 * Same IDOR-safe pattern as requireBoardRole/requireTaskRole, one hop
 * further: comment -> task -> board -> workspace -> membership. Ownership
 * (can you edit/delete THIS comment) is a separate, stricter check inside
 * comment.service.ts - this middleware only confirms you're allowed to be
 * looking at the comment's workspace at all.
 */
export function requireCommentRole(minRole: WorkspaceRole, paramName = "id") {
  return async (req: CommentScopedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const commentId = req.params[paramName];
      if (!Types.ObjectId.isValid(commentId)) {
        throw AppError.notFound("Comment not found");
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw AppError.notFound("Comment not found");
      }

      const task = await Task.findById(comment.taskId);
      if (!task) {
        throw AppError.notFound("Comment not found");
      }

      const board = await Board.findById(task.boardId);
      if (!board) {
        throw AppError.notFound("Comment not found");
      }

      const { workspace, role } = await assertWorkspaceAccess(board.workspaceId, req.userId as string, minRole);

      req.comment = comment;
      req.task = task;
      req.board = board;
      req.workspace = workspace;
      req.membershipRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
