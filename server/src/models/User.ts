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
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String },
  },
  { timestamps: true }
);

// toJSON transform strips the password hash from every serialized response,
// so controllers can never accidentally leak it even if they forget to omit it.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const { passwordHash, __v, ...user } = ret;
    return user;
  },
});

export const User = model<IUser>("User", userSchema);
