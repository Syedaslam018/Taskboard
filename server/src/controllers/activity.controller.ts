import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { activityService } from "../services/activity.service";
import { WorkspaceScopedRequest } from "../middleware/rbac";

export const activityController = {
  // Mounted under /api/workspaces/:id/activity behind requireWorkspaceRole(VIEWER).
  list: catchAsync(async (req: WorkspaceScopedRequest, res) => {
    const { page, limit } = req.query as Record<string, string | undefined>;
    const result = await activityService.listForWorkspace(String(req.workspace!._id), {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    sendSuccess(res, result, "Activity feed retrieved");
  }),
};
