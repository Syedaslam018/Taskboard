import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      type: String,
    },
  },
  { timestamps: true }
);

// Remove sensitive fields from JSON responses.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const result = ret as unknown as Record<string, unknown>;

    delete result.passwordHash;
    delete result.__v;

    return result;
  },
});

export const User = model<IUser>("User", userSchema);