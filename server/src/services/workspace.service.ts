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

  /**
   * Populated member list (name/email/avatar), for UI that needs to show
   * who's who - e.g. an assignee picker or "added by Sarah" notification
   * text - as opposed to listForUser/getOne which return raw member IDs.
   * Re-queries by ID with .populate() rather than calling .populate() on the
   * already-hydrated document, since Mongoose's typing for the latter is
   * awkward to express correctly without a compiler on hand to verify it.
   */
  async listMembersWithUsers(workspace: IWorkspace) {
    const populated = await Workspace.findById(workspace._id)
      .select("members")
      .populate("members.user", "name email avatar")
      .lean();
    return populated?.members ?? [];
  },

  async update(workspace: IWorkspace, updates: { name?: string; description?: string }): Promise<IWorkspace> {
    if (updates.name !== undefined) workspace.name = updates.name;
    if (updates.description !== undefined) workspace.description = updates.description;
    await workspace.save();
    return workspace;
  },

  async remove(workspace: IWorkspace): Promise<void> {
    // Cascade-delete all workspace-related data: boards → tasks → comments,
    // plus activities and notifications scoped to this workspace.
    const { Board } = await import("../models/Board");
    const { Task } = await import("../models/Task");
    const { Comment } = await import("../models/Comment");
    const { Activity } = await import("../models/Activity");
    const { Notification } = await import("../models/Notification");

    // Find all boards in this workspace
    const boards = await Board.find({ workspaceId: workspace._id }).select("_id").lean();
    const boardIds = boards.map((b) => b._id);

    // Find all tasks in those boards
    const taskIds = await Task.find({ boardId: { $in: boardIds } }).distinct("_id");

    // Delete in dependency order: comments → tasks → boards
    await Comment.deleteMany({ taskId: { $in: taskIds } });
    await Task.deleteMany({ boardId: { $in: boardIds } });
    await Board.deleteMany({ workspaceId: workspace._id });

    // Delete activities and notifications for this workspace
    await Activity.deleteMany({ workspaceId: workspace._id });
    await Notification.deleteMany({ workspaceId: workspace._id });

    await workspace.deleteOne();
  },

  async addMember(
    workspace: IWorkspace,
    email: string,
    role: WorkspaceRole
  ): Promise<{ workspace: IWorkspace; addedUserId: string }> {
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
    return { workspace, addedUserId: user._id.toString() };
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
