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
 * Loads the workspace identified by req.params[paramName], verifies the
 * authenticated user is a member, and verifies their role meets minRole.
 * Attaches the workspace doc and the caller's role to the request so
 * downstream controllers don't have to re-fetch it.
 *
 * Returns 404 (not 403) when the workspace doesn't exist OR the user isn't
 * a member - this intentionally avoids leaking whether a given workspace
 * ID exists to users who aren't part of it (prevents ID enumeration / IDOR
 * probing).
 */
export function requireWorkspaceRole(minRole: WorkspaceRole, paramName = "id") {
  return async (req: WorkspaceScopedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.params[paramName];
      if (!Types.ObjectId.isValid(workspaceId)) {
        throw AppError.notFound("Workspace not found");
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      const membership = workspace.members.find((m) => m.user.toString() === req.userId);
      if (!membership) {
        throw AppError.notFound("Workspace not found");
      }

      if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
        throw AppError.forbidden(
          `This action requires the ${minRole} role or higher (you are ${membership.role})`
        );
      }

      req.workspace = workspace;
      req.membershipRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
