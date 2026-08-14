import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { dashboardService } from "../services/dashboard.service";
import { AuthenticatedRequest } from "../middleware/auth";

export const dashboardController = {
  get: catchAsync(async (req: AuthenticatedRequest, res) => {
    const result = await dashboardService.getForUser(req.userId as string);
    sendSuccess(res, result, "Dashboard retrieved");
  }),
};
