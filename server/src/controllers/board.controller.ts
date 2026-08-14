import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { boardService } from "../services/board.service";
import { BoardScopedRequest } from "../middleware/boardAccess";
import { AuthenticatedRequest } from "../middleware/auth";
import { assertWorkspaceAccess, WorkspaceScopedRequest } from "../middleware/rbac";
import { WorkspaceRole } from "../models/Workspace";
import { activityService } from "../services/activity.service";
import { ActivityType } from "../models/Activity";

export const boardController = {
  // POST /api/boards - workspaceId comes from the body, so membership is
  // checked explicitly here rather than via a URL-param middleware.
  create: catchAsync(async (req: AuthenticatedRequest, res) => {
    const { workspaceId, name, description, columns } = req.body;
    await assertWorkspaceAccess(workspaceId, req.userId as string, WorkspaceRole.ADMIN);

    const board = await boardService.create(workspaceId, req.userId as string, name, description, columns);

    await activityService.record({
      workspaceId,
      actor: req.userId as string,
      type: ActivityType.BOARD_CREATED,
      message: `${req.authUser!.name} created the board "${board.name}"`,
      metadata: { boardId: String(board._id) },
    });

    sendSuccess(res, { board }, "Board created successfully", 201);
  }),

  listForWorkspace: catchAsync(async (req: WorkspaceScopedRequest, res) => {
    const boards = await boardService.listForWorkspace(String(req.workspace!._id));
    sendSuccess(res, { boards }, "Boards retrieved");
  }),

  getOne: catchAsync(async (req: BoardScopedRequest, res) => {
    sendSuccess(res, { board: req.board, role: req.membershipRole }, "Board retrieved");
  }),

  update: catchAsync(async (req: BoardScopedRequest, res) => {
    const board = await boardService.update(req.board!, req.body);
    sendSuccess(res, { board }, "Board updated successfully");
  }),

  remove: catchAsync(async (req: BoardScopedRequest, res) => {
    await boardService.remove(req.board!);
    sendSuccess(res, null, "Board deleted successfully");
  }),

  addColumn: catchAsync(async (req: BoardScopedRequest, res) => {
    const board = await boardService.addColumn(req.board!, req.body.name);
    sendSuccess(res, { board }, "Column added successfully", 201);
  }),

  removeColumn: catchAsync(async (req: BoardScopedRequest, res) => {
    const board = await boardService.removeColumn(req.board!, req.params.columnId);
    sendSuccess(res, { board }, "Column removed successfully");
  }),
};
