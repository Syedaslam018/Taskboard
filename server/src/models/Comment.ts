import { Schema, model, Document, Types } from "mongoose";

export interface IComment extends Document {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 3000 },
  },
  { timestamps: true }
);

// A task's comment thread is read in creation order - this index serves
// that directly, matching the spec's suggested taskId+createdAt index.
commentSchema.index({ taskId: 1, createdAt: 1 });

export const Comment = model<IComment>("Comment", commentSchema);
