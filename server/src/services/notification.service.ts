import { Types } from "mongoose";
import { Notification, INotification, NotificationType } from "../models/Notification";
import { AppError } from "../utils/AppError";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  message: string;
  workspaceId: string;
  taskId?: string;
}

export const notificationService = {
  async create(input: CreateNotificationInput): Promise<INotification> {
    return Notification.create({
      user: new Types.ObjectId(input.userId),
      type: input.type,
      message: input.message,
      workspaceId: new Types.ObjectId(input.workspaceId),
      taskId: input.taskId ? new Types.ObjectId(input.taskId) : undefined,
    });
  },

  async listForUser(userId: string, opts: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const query: Record<string, unknown> = { user: new Types.ObjectId(userId) };
    if (opts.unreadOnly) query.read = false;

    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 30;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: new Types.ObjectId(userId), read: false }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  },

  async markRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw AppError.notFound("Notification not found");
    }
    // Ownership check, not RBAC - a notification belongs to exactly one
    // user, so ADMIN/OWNER status in the workspace is irrelevant here.
    if (notification.user.toString() !== userId) {
      throw AppError.notFound("Notification not found");
    }
    notification.read = true;
    await notification.save();
    return notification;
  },
};
