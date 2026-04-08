import mongoose, { Schema, type Model } from "mongoose";

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password?: string; // Optional — Google OAuth users may not have a password
  googleId?: string; // Google OAuth subject ID
  isVerified: boolean;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, // Google OAuth users may not have a password
      select: false,
    },
    googleId: {
      type: String,
      default: "",
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

const User = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>("User", userSchema);

export default User;
