import { Schema, model, Document, Types } from "mongoose";

export enum ActivityType {
  TASK_CREATED = "TASK_CREATED",
  TASK_MOVED = "TASK_MOVED",
  TASK_DELETED = "TASK_DELETED",
  COMMENT_ADDED = "COMMENT_ADDED",
  MEMBER_ADDED = "MEMBER_ADDED",
  BOARD_CREATED = "BOARD_CREATED",
}

export interface IActivity extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  actor: Types.ObjectId;
  type: ActivityType;
  // Precomputed, human-readable line (e.g. `Sarah moved "Dashboard UI" to Review`)
  // rather than re-deriving it from `metadata` on every read - the timeline is
  // read far more often than activities are written.
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: Object.values(ActivityType), required: true },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The activity feed's only query is "this workspace's events, newest first".
activitySchema.index({ workspaceId: 1, createdAt: -1 });

export const Activity = model<IActivity>("Activity", activitySchema);
