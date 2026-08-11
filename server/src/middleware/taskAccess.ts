import { NextFunction, Response } from "express";
import { Types } from "mongoose";
import { AppError } from "../utils/AppError";
import { Task, ITask } from "../models/Task";
import { Board, IBoard } from "../models/Board";
import { WorkspaceRole, IWorkspace } from "../models/Workspace";
import { assertWorkspaceAccess } from "./rbac";
import { AuthenticatedRequest } from "./auth";

export interface TaskScopedRequest extends AuthenticatedRequest {
  task?: ITask;
  board?: IBoard;
  workspace?: IWorkspace;
  membershipRole?: WorkspaceRole;
}

/**
 * Task -> board -> workspace -> membership, same IDOR-safe pattern as
 * requireBoardRole. Guessing a valid task ID from another workspace still
 * returns 404, never leaking that the task exists.
 */
export function requireTaskRole(minRole: WorkspaceRole, paramName = "id") {
  return async (req: TaskScopedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const taskId = req.params[paramName];
      if (!Types.ObjectId.isValid(taskId)) {
        throw AppError.notFound("Task not found");
      }

      const task = await Task.findById(taskId);
      if (!task) {
        throw AppError.notFound("Task not found");
      }

      const board = await Board.findById(task.boardId);
      if (!board) {
        throw AppError.notFound("Task not found");
      }

      const { workspace, role } = await assertWorkspaceAccess(board.workspaceId, req.userId as string, minRole);

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
