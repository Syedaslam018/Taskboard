import { Types } from "mongoose";
import { Workspace, IWorkspace, WorkspaceRole, ROLE_RANK } from "../models/Workspace";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";

export const workspaceService = {
  async create(ownerId: string, name: string, description?: string): Promise<IWorkspace> {
    const workspace = await Workspace.create({
      name,
      description,
      owner: new Types.ObjectId(ownerId),
      members: [{ user: new Types.ObjectId(ownerId), role: WorkspaceRole.OWNER, joinedAt: new Date() }],
    });
    return workspace;
  },

  /**
   * Lists only the workspaces the user is a member of. .lean() + a
   * projection because this powers a list view that doesn't need full
   * Mongoose documents or every field.
   */
  async listForUser(userId: string) {
    return Workspace.find({ "members.user": new Types.ObjectId(userId) })
      .select("name description owner members createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
  },

  async update(workspace: IWorkspace, updates: { name?: string; description?: string }): Promise<IWorkspace> {
    if (updates.name !== undefined) workspace.name = updates.name;
    if (updates.description !== undefined) workspace.description = updates.description;
    await workspace.save();
    return workspace;
  },

  async remove(workspace: IWorkspace): Promise<void> {
    await workspace.deleteOne();
    // Phase 4+: cascade-delete boards/tasks/comments belonging to this workspace.
  },

  async addMember(workspace: IWorkspace, email: string, role: WorkspaceRole): Promise<IWorkspace> {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      throw AppError.notFound("No user found with that email");
    }

    const alreadyMember = workspace.members.some((m) => m.user.toString() === user._id.toString());
    if (alreadyMember) {
      throw AppError.conflict("This user is already a member of the workspace");
    }

    workspace.members.push({ user: user._id, role, joinedAt: new Date() });
    await workspace.save();
    return workspace;
  },

  /**
   * The route only requires VIEWER membership (so anyone can hit it to leave
   * the workspace). This method is what actually enforces that removing
   * *someone else* requires ADMIN+, while removing yourself is always allowed.
   */
  async removeMember(
    workspace: IWorkspace,
    targetUserId: string,
    requesterId: string,
    requesterRole: WorkspaceRole
  ): Promise<IWorkspace> {
    const target = workspace.members.find((m) => m.user.toString() === targetUserId);
    if (!target) {
      throw AppError.notFound("This user is not a member of the workspace");
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw AppError.badRequest("The workspace owner cannot be removed. Transfer ownership first.");
    }

    const isSelfRemoval = targetUserId === requesterId;
    if (!isSelfRemoval && ROLE_RANK[requesterRole] < ROLE_RANK[WorkspaceRole.ADMIN]) {
      throw AppError.forbidden("Only an admin or owner can remove other members");
    }

    workspace.members = workspace.members.filter((m) => m.user.toString() !== targetUserId);
    await workspace.save();
    return workspace;
  },

  async updateMemberRole(
    workspace: IWorkspace,
    targetUserId: string,
    newRole: WorkspaceRole
  ): Promise<IWorkspace> {
    const target = workspace.members.find((m) => m.user.toString() === targetUserId);
    if (!target) {
      throw AppError.notFound("This user is not a member of the workspace");
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw AppError.badRequest("The workspace owner's role cannot be changed here.");
    }
    target.role = newRole;
    await workspace.save();
    return workspace;
  },
};
