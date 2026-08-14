import { Schema, model, Document, Types } from "mongoose";

export interface IBoardColumn {
  _id: Types.ObjectId;
  name: string;
  order: number;
  // Explicit flag rather than matching column.name against /done/i - name
  // matching breaks the moment someone renames "Done" to "Shipped" or adds
  // a second done-ish column ("Deployed"). Dashboard stats (completed vs.
  // overdue vs. in-progress) key off this field instead.
  isDone: boolean;
}

export interface IBoard extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  name: string;
  description?: string;
  columns: IBoardColumn[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const columnSchema = new Schema<IBoardColumn>({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  order: { type: Number, required: true },
  isDone: { type: Boolean, default: false },
});

const boardSchema = new Schema<IBoard>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    columns: { type: [columnSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Every board list view is scoped to a workspace ("boards in this project"),
// so this is the primary lookup pattern.
boardSchema.index({ workspaceId: 1, createdAt: -1 });

export const DEFAULT_COLUMNS = ["Backlog", "To Do", "In Progress", "Review", "Done"];

export const Board = model<IBoard>("Board", boardSchema);
