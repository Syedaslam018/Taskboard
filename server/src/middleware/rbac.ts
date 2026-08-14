import { NextFunction, Response } from "express";
import { Types } from "mongoose";
import { AppError } from "../utils/AppError";
import { Workspace, WorkspaceRole, ROLE_RANK, IWorkspace } from "../models/Workspace";
import { AuthenticatedRequest } from "./auth";

export interface WorkspaceScopedRequest extends AuthenticatedRequest {
  workspace?: IWorkspace;
  membershipRole?: WorkspaceRole;
}

/**
 * Core membership check, reused by every access-control layer in the app
 * (workspace routes directly; board/task routes indirectly via
 * requireBoardRole/requireTaskRole). Throws 404 for both "workspace doesn't
 * exist" and "you're not a member" so IDs aren't enumerable, and 403 once
 * membership is confirmed but the role is insufficient.
 */
export async function assertWorkspaceAccess(
  workspaceId: Types.ObjectId | string,
  userId: string,
  minRole: WorkspaceRole
): Promise<{ workspace: IWorkspace; role: WorkspaceRole }> {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw AppError.notFound("Workspace not found");
  }

  const membership = workspace.members.find((m) => m.user.toString() === userId);
  if (!membership) {
    throw AppError.notFound("Workspace not found");
  }

  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw AppError.forbidden(
      `This action requires the ${minRole} role or higher (you are ${membership.role})`
    );
  }

  return { workspace, role: membership.role };
}

/**
 * Loads the workspace identified by req.params[paramName] and applies
 * assertWorkspaceAccess. Attaches the workspace doc and the caller's role
 * to the request so downstream controllers don't have to re-fetch it.
 */
export function requireWorkspaceRole(minRole: WorkspaceRole, paramName = "id") {
  return async (req: WorkspaceScopedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.params[paramName];
      if (!Types.ObjectId.isValid(workspaceId)) {
        throw AppError.notFound("Workspace not found");
      }

      const { workspace, role } = await assertWorkspaceAccess(workspaceId, req.userId as string, minRole);
      req.workspace = workspace;
      req.membershipRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Confirms a candidate assignee is actually a member of the workspace, so a
 * task can't be assigned to an arbitrary user ID that happens to be a valid
 * ObjectId but has no access to the board at all.
 */
export function assertIsWorkspaceMember(workspace: IWorkspace, userId: string): void {
  const isMember = workspace.members.some((m) => m.user.toString() === userId);
  if (!isMember) {
    throw AppError.badRequest("Assignee must be a member of this workspace");
  }
}
