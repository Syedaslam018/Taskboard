import { Schema, model, Document, Types } from "mongoose";

export enum NotificationType {
  TASK_ASSIGNED = "TASK_ASSIGNED",
  TASK_MOVED = "TASK_MOVED",
  COMMENT_ADDED = "COMMENT_ADDED",
  MEMBER_ADDED = "MEMBER_ADDED",
}

export interface INotification extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationType;
  message: string;
  workspaceId: Types.ObjectId;
  taskId?: Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The bell icon's primary query is "this user's unread notifications, newest
// first" - this compound index serves that directly, matching the spec's
// suggested userId+read index.
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);
