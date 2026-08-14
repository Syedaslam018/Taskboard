import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { notificationService } from "../services/notification.service";
import { AuthenticatedRequest } from "../middleware/auth";

export const notificationController = {
  list: catchAsync(async (req: AuthenticatedRequest, res) => {
    const { unread, page, limit } = req.query as Record<string, string | undefined>;
    const result = await notificationService.listForUser(req.userId as string, {
      unreadOnly: unread === "true",
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    sendSuccess(res, result, "Notifications retrieved");
  }),

  markRead: catchAsync(async (req: AuthenticatedRequest, res) => {
    const notification = await notificationService.markRead(req.params.id, req.userId as string);
    sendSuccess(res, { notification }, "Notification marked as read");
  }),
};
