import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { workspaceService } from "../services/workspace.service";
import { WorkspaceScopedRequest } from "../middleware/rbac";
import { AuthenticatedRequest } from "../middleware/auth";
import { activityService } from "../services/activity.service";
import { notificationService } from "../services/notification.service";
import { ActivityType } from "../models/Activity";
import { NotificationType } from "../models/Notification";
import { getIO } from "../sockets/io";
import { workspaceRoom, userRoom } from "../sockets/rooms";

export const workspaceController = {
  create: catchAsync(async (req: AuthenticatedRequest, res) => {
    const { name, description } = req.body;
    const workspace = await workspaceService.create(req.userId as string, name, description);
    sendSuccess(res, { workspace }, "Workspace created successfully", 201);
  }),

  list: catchAsync(async (req: AuthenticatedRequest, res) => {
    const workspaces = await workspaceService.listForUser(req.userId as string);
    sendSuccess(res, { workspaces }, "Workspaces retrieved");
  }),

  // Attached by requireWorkspaceRole(VIEWER) - membership already verified.
  getOne: catchAsync(async (req: WorkspaceScopedRequest, res) => {
    sendSuccess(res, { workspace: req.workspace, role: req.membershipRole }, "Workspace retrieved");
  }),

  listMembers: catchAsync(async (req: WorkspaceScopedRequest, res) => {
    const members = await workspaceService.listMembersWithUsers(req.workspace!);
    sendSuccess(res, { members }, "Members retrieved");
  }),

  update: catchAsync(async (req: WorkspaceScopedRequest, res) => {
    const workspace = await workspaceService.update(req.workspace!, req.body);
    sendSuccess(res, { workspace }, "Workspace updated successfully");
  }),

  remove: catchAsync(async (req: WorkspaceScopedRequest, res) => {
    await workspaceService.remove(req.workspace!);
    sendSuccess(res, null, "Workspace deleted successfully");
  }),

  addMember: catchAsync(async (req: WorkspaceScopedRequest, res) => {
    const { email, role } = req.body;
    const { workspace, addedUserId } = await workspaceService.addMember(req.workspace!, email, role);
    const workspaceId = String(workspace._id);

    await activityService.record({
      workspaceId,
      actor: req.userId as string,
      type: ActivityType.MEMBER_ADDED,
      message: `${req.authUser!.name} added ${email} to the workspace`,
      metadata: { addedUserId, role },
    });

    const notification = await notificationService.create({
      userId: addedUserId,
      type: NotificationType.MEMBER_ADDED,
      message: `${req.authUser!.name} added you to "${workspace.name}"`,
      workspaceId,
    });

    getIO()
      ?.to(workspaceRoom(workspaceId))
      .emit("member:added", { workspaceId, email, role });
    getIO()?.to(userRoom(addedUserId)).emit("notification:new", notification);

    sendSuccess(res, { workspace }, "Member added successfully", 201);
  }),

  removeMember: catchAsync(async (req: WorkspaceScopedRequest, res) => {
    const workspace = await workspaceService.removeMember(
      req.workspace!,
      req.params.userId,
      req.userId as string,
      req.membershipRole!
    );

    getIO()
      ?.to(workspaceRoom(String(workspace._id)))
      .emit("member:removed", { workspaceId: String(workspace._id), userId: req.params.userId });

    sendSuccess(res, { workspace }, "Member removed successfully");
  }),

  updateMemberRole: catchAsync(async (req: WorkspaceScopedRequest, res) => {
    const workspace = await workspaceService.updateMemberRole(req.workspace!, req.params.userId, req.body.role);
    sendSuccess(res, { workspace }, "Member role updated successfully");
  }),
};
