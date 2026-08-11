import { Schema, model, Document, Types } from "mongoose";

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export interface ITask extends Document {
  _id: Types.ObjectId;
  boardId: Types.ObjectId;
  columnId: Types.ObjectId;
  title: string;
  description?: string;
  priority: TaskPriority;
  assignee?: Types.ObjectId;
  createdBy: Types.ObjectId;
  labels: string[];
  dueDate?: Date;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    boardId: { type: Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    columnId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    priority: { type: String, enum: Object.values(TaskPriority), default: TaskPriority.MEDIUM },
    assignee: { type: Schema.Types.ObjectId, ref: "User", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    labels: { type: [String], default: [] },
    dueDate: { type: Date },
    // Fractional-ish integer position within a column, used to order cards
    // without rewriting every sibling task on every move (see task.service.ts).
    position: { type: Number, required: true },
  },
  { timestamps: true }
);

// The Kanban board's primary read is "all tasks in this board, grouped by
// column, in position order" - this compound index serves that directly.
taskSchema.index({ boardId: 1, columnId: 1, position: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ createdAt: -1 });

export const Task = model<ITask>("Task", taskSchema);
