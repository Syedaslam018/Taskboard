import { NextFunction, Response } from "express";
import { Types } from "mongoose";
import { AppError } from "../utils/AppError";
import { Board, IBoard } from "../models/Board";
import { WorkspaceRole, IWorkspace } from "../models/Workspace";
import { assertWorkspaceAccess } from "./rbac";
import { AuthenticatedRequest } from "./auth";

export interface BoardScopedRequest extends AuthenticatedRequest {
  board?: IBoard;
  workspace?: IWorkspace;
  membershipRole?: WorkspaceRole;
}

/**
 * Boards are identified by their own _id in the URL (e.g. /api/boards/:id),
 * not by workspaceId - so access control has to hop board -> workspaceId ->
 * membership. This is the IDOR-safe check: a valid board ID that belongs to
 * a workspace you're not in returns 404, same as a workspace ID would.
 */
export function requireBoardRole(minRole: WorkspaceRole, paramName = "id") {
  return async (req: BoardScopedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params[paramName];
      if (!Types.ObjectId.isValid(boardId)) {
        throw AppError.notFound("Board not found");
      }

      const board = await Board.findById(boardId);
      if (!board) {
        throw AppError.notFound("Board not found");
      }

      const { workspace, role } = await assertWorkspaceAccess(board.workspaceId, req.userId as string, minRole);

      req.board = board;
      req.workspace = workspace;
      req.membershipRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
