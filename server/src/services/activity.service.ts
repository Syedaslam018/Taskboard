import { Types } from "mongoose";
import { Activity, ActivityType } from "../models/Activity";

interface RecordActivityInput {
  workspaceId: string;
  actor: string;
  type: ActivityType;
  message: string;
  metadata?: Record<string, unknown>;
}

export const activityService = {
  async record(input: RecordActivityInput) {
    return Activity.create({
      workspaceId: new Types.ObjectId(input.workspaceId),
      actor: new Types.ObjectId(input.actor),
      type: input.type,
      message: input.message,
      metadata: input.metadata,
    });
  },

  async listForWorkspace(workspaceId: string, opts: { page?: number; limit?: number }) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 30;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find({ workspaceId: new Types.ObjectId(workspaceId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments({ workspaceId: new Types.ObjectId(workspaceId) }),
    ]);

    return { activities, total, page, limit };
  },
};
